using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Projet.Domain.Model;
using Projet.Domain.Interface;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Projet.Infrastructure.Hubs;


using DomainTask = Projet.Domain.Model.Task;

namespace Projet.Infrastructure.Service
{
    public interface INotificationService
    {
        System.Threading.Tasks.Task<Notification> CreateNotificationAsync(int userId, string title, string message, 
            NotificationType type, NotificationCategory category, string? link = null,
            int? relatedTaskId = null, int? relatedProjectId = null, 
            int? relatedUserStoryId = null, int? relatedUserId = null,
            string? oldValue = null, string? newValue = null);

        System.Threading.Tasks.Task<Notification> NotifyTaskStatusChangeAsync(int taskId, int projectManagerId, 
            string oldStatus, string newStatus, int assignedToId);

        System.Threading.Tasks.Task<Notification> NotifyTaskAssignedAsync(int taskId, int projectManagerId,
            int assignedToId);

        System.Threading.Tasks.Task<Notification> NotifyTaskAddedAsync(int taskId);

        System.Threading.Tasks.Task<Notification> NotifyUserStoryAddedAsync(int userStoryId, int projectManagerId, 
            int assignedToId);

        System.Threading.Tasks.Task<Notification> NotifyProjectAddedAsync(int projectId, int projectManagerId,
            int? serviceManagerId = null, int? adminUserId = null, int? createdByUserId = null);

        System.Threading.Tasks.Task<Notification> NotifySprintAddedAsync(int sprintId, int projectManagerId,
            int? serviceManagerId = null, int? adminUserId = null, int? createdByUserId = null);

        System.Threading.Tasks.Task<Notification> NotifyUserRoleChangedAsync(int changedUserId, int changedByUserId, 
            string oldRole, string newRole);

        System.Threading.Tasks.Task<Notification> NotifyTaskDeadlineAsync(int taskId, int assignedToId, int projectManagerId, 
            string urgencyLevel);

        System.Threading.Tasks.Task SendUnreadNotificationEmailsAsync(int daysOld = 1);

        System.Threading.Tasks.Task SendOverdueTaskEmailsAsync();

        System.Threading.Tasks.Task<IEnumerable<Notification>> GetUserNotificationsAsync(int userId, bool onlyUnread = false);

        System.Threading.Tasks.Task<IEnumerable<Notification>> GetConversationAsync(int currentUserId, int otherUserId);

        System.Threading.Tasks.Task PublishUserNotificationsAsync(int userId);
    }

    public class NotificationService : INotificationService
    {
        private readonly IApplicationDbSet _context;
        private readonly IEmailService _emailService;
        private readonly IHubContext<NotificationHub> _hubContext;

        public NotificationService(IApplicationDbSet context, IEmailService emailService, IHubContext<NotificationHub> hubContext)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
        }

        public async System.Threading.Tasks.Task<Notification> CreateNotificationAsync(int userId, string title, string message,
            NotificationType type, NotificationCategory category, string? link = null,
            int? relatedTaskId = null, int? relatedProjectId = null,
            int? relatedUserStoryId = null, int? relatedUserId = null,
            string? oldValue = null, string? newValue = null)
        {
            var notification = new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                Category = category,
                Link = link,
                RelatedTaskId = relatedTaskId,
                RelatedProjectId = relatedProjectId,
                RelatedUserStoryId = relatedUserStoryId,
                RelatedUserId = relatedUserId,
                OldValue = oldValue,
                NewValue = newValue,
                CreatedAt = DateTime.UtcNow,
                IsRead = false,
                EmailSent = false
            };

            _context.Set<Notification>().Add(notification);
            await _context.SaveChangesAsync(default);

            
            var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == userId);
            if (user != null)
            {
                await SendNotificationEmailAsync(user.Email, title, message);
                notification.EmailSent = true;
                notification.EmailSentAt = DateTime.UtcNow;
                _context.Set<Notification>().Update(notification);
                await _context.SaveChangesAsync(default);
            }

            await PublishUserNotificationsAsync(userId);

            return notification;
        }

        public async System.Threading.Tasks.Task<Notification> NotifyTaskStatusChangeAsync(int taskId, int projectManagerId,
            string oldStatus, string newStatus, int assignedToId)
        {
            var task = await _context.Set<DomainTask>().FirstOrDefaultAsync(t => t.Id == taskId);
            if (task == null)
                throw new InvalidOperationException("Tâche non trouvée");

            var title = "Changement de Statut de Tâche";
            var link = $"/tasks/{taskId}";

            Notification? employeeNotification = null;
            if (assignedToId > 0)
            {
                var employeeMessage = newStatus.Equals(nameof(State.pending), StringComparison.OrdinalIgnoreCase)
                    ? $"Votre tâche '{task.Title}' est marquée comme not confirmed."
                    : newStatus.Equals(nameof(State.validated), StringComparison.OrdinalIgnoreCase)
                        ? $"Votre tâche '{task.Title}' a été validée."
                        : newStatus.Equals(nameof(State.done), StringComparison.OrdinalIgnoreCase)
                            ? $"Votre tâche '{task.Title}' est marquée comme terminée."
                            : $"La tâche '{task.Title}' a changé de statut: {oldStatus} → {newStatus}";

                employeeNotification = await CreateNotificationAsync(
                    userId: assignedToId,
                    title: title,
                    message: employeeMessage,
                    type: NotificationType.TaskStatusChanged,
                    category: NotificationCategory.TaskUpdate,
                    link: link,
                    relatedTaskId: taskId,
                    relatedUserId: projectManagerId > 0 ? projectManagerId : null,
                    oldValue: oldStatus,
                    newValue: newStatus);
            }

            Notification? pmNotification = null;
            if (projectManagerId > 0 && projectManagerId != assignedToId)
            {
                var pmMessage = $"La tâche '{task.Title}' a changé de statut: {oldStatus} → {newStatus}";

                pmNotification = await CreateNotificationAsync(
                    userId: projectManagerId,
                    title: title,
                    message: pmMessage,
                    type: NotificationType.TaskStatusChanged,
                    category: NotificationCategory.TaskUpdate,
                    link: link,
                    relatedTaskId: taskId,
                    relatedUserId: assignedToId > 0 ? assignedToId : null,
                    oldValue: oldStatus,
                    newValue: newStatus);
            }

            return employeeNotification ?? pmNotification
                ?? throw new InvalidOperationException("Aucun destinataire valide pour la notification de statut de tâche");
        }

        public async System.Threading.Tasks.Task<Notification> NotifyTaskAssignedAsync(int taskId, int projectManagerId,
            int assignedToId)
        {
            var task = await _context.Set<DomainTask>()
                .Include(t => t.UserStory)
                    .ThenInclude(us => us.Project)
                .Include(t => t.AssignedTo)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null)
            {
                throw new InvalidOperationException("Tâche non trouvée");
            }

            var projectName = task.UserStory?.Project?.name ?? "Projet";
            var link = $"/tasks/{taskId}";
            var title = "Tâche affectée";
            var assignedUserName = task.AssignedTo != null
                ? $"{task.AssignedTo.FirstName} {task.AssignedTo.LastName}".Trim()
                : "l'employé";

            Notification? assigneeNotification = null;
            if (assignedToId > 0)
            {
                assigneeNotification = await CreateNotificationAsync(
                    userId: assignedToId,
                    title: title,
                    message: $"Une tâche '{task.Title}' vous a été affectée sur le projet '{projectName}'.",
                    type: NotificationType.Info,
                    category: NotificationCategory.TaskUpdate,
                    link: link,
                    relatedTaskId: taskId,
                    relatedProjectId: task.UserStory?.ProjectId,
                    relatedUserStoryId: task.UserStoryId,
                    relatedUserId: projectManagerId > 0 ? projectManagerId : null,
                    newValue: assignedToId.ToString());
            }

            Notification? pmNotification = null;
            if (projectManagerId > 0 && projectManagerId != assignedToId)
            {
                pmNotification = await CreateNotificationAsync(
                    userId: projectManagerId,
                    title: title,
                    message: $"La tâche '{task.Title}' a été affectée à {assignedUserName} dans le projet '{projectName}'.",
                    type: NotificationType.Info,
                    category: NotificationCategory.TaskUpdate,
                    link: link,
                    relatedTaskId: taskId,
                    relatedProjectId: task.UserStory?.ProjectId,
                    relatedUserStoryId: task.UserStoryId,
                    relatedUserId: assignedToId > 0 ? assignedToId : null,
                    newValue: assignedToId.ToString());
            }

            return assigneeNotification ?? pmNotification
                ?? throw new InvalidOperationException("Aucun destinataire valide pour la notification d'affectation de tâche");
        }

        public async System.Threading.Tasks.Task<Notification> NotifyTaskAddedAsync(int taskId)
        {
            var task = await _context.Set<DomainTask>()
                .Include(t => t.UserStory)
                    .ThenInclude(us => us.Project)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null)
            {
                throw new InvalidOperationException("Tâche non trouvée");
            }

            var title = "Nouvelle Tâche Assignée";
            var link = $"/tasks/{taskId}";
            var message = $"Une nouvelle tâche '{task.Title}' a été ajoutée.";

            var recipients = new HashSet<int>();

            if (task.AssignedToId.HasValue && task.AssignedToId.Value > 0)
            {
                recipients.Add(task.AssignedToId.Value);
            }

            var projectManagerId = task.UserStory?.Project?.ProjectManagerId ?? 0;
            if (projectManagerId > 0)
            {
                recipients.Add(projectManagerId);
            }

            var observerIds = await _context.Set<User>()
                .Where(user => user.role == UserRole.Observer)
                .Select(user => user.Id)
                .ToListAsync();

            foreach (var observerId in observerIds)
            {
                if (observerId > 0)
                {
                    recipients.Add(observerId);
                }
            }

            Notification? firstNotification = null;
            foreach (var recipientId in recipients)
            {
                var recipientMessage = recipientId == task.AssignedToId
                    ? $"Une nouvelle tâche '{task.Title}' vous a été assignée."
                    : recipientId == projectManagerId
                        ? $"Une nouvelle tâche '{task.Title}' a été ajoutée au projet."
                        : $"Une nouvelle tâche '{task.Title}' a été ajoutée au projet '{task.UserStory?.Project?.name ?? "Projet"}'.";

                var notification = await CreateNotificationAsync(
                    userId: recipientId,
                    title: title,
                    message: recipientMessage,
                    type: NotificationType.Info,
                    category: NotificationCategory.TaskUpdate,
                    link: link,
                    relatedTaskId: taskId,
                    relatedProjectId: task.UserStory?.ProjectId,
                    relatedUserStoryId: task.UserStoryId,
                    relatedUserId: task.AssignedToId,
                    newValue: task.Status.ToString());

                firstNotification ??= notification;
            }

            return firstNotification ?? throw new InvalidOperationException("Aucun destinataire valide pour la notification de création de tâche");
        }

        public async System.Threading.Tasks.Task<Notification> NotifyUserStoryAddedAsync(int userStoryId, int projectManagerId,
            int assignedToId)
        {
            var userStory = await _context.Set<UserStory>().FirstOrDefaultAsync(us => us.Id == userStoryId);
            if (userStory == null)
                throw new InvalidOperationException("User Story non trouvée");

            var title = "Nouvelle User Story Assignée";
            var message = $"Une nouvelle user story '{userStory.Title}' vous a été assignée et doit être complétée.";
            var link = $"/user-stories/{userStoryId}";

            var notification = await CreateNotificationAsync(
                userId: projectManagerId,
                title: title,
                message: message,
                type: NotificationType.UserStoryAdded,
                category: NotificationCategory.UserStoryUpdate,
                link: link,
                relatedUserStoryId: userStoryId,
                relatedUserId: assignedToId);

            return notification;
        }

        public async System.Threading.Tasks.Task<Notification> NotifyProjectAddedAsync(int projectId, int projectManagerId,
            int? serviceManagerId = null, int? adminUserId = null, int? createdByUserId = null)
        {
            var project = await _context.Set<Project>().FirstOrDefaultAsync(p => p.id == projectId);
            if (project == null)
                throw new InvalidOperationException("Projet non trouvé");

            var link = $"/projects/{projectId}";
            var message = $"Un nouveau projet '{project.name}' a été créé.";

            if (createdByUserId.HasValue)
            {
                var creator = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == createdByUserId.Value);
                if (creator != null)
                {
                    message = $"Un nouveau projet '{project.name}' a été créé par {creator.FirstName} {creator.LastName} ({creator.role}).";
                }
            }

            
            var pmNotification = await CreateNotificationAsync(
                userId: projectManagerId,
                title: "Nouveau Projet Créé",
                message: message,
                type: NotificationType.ProjectAdded,
                category: NotificationCategory.ProjectUpdate,
                link: link,
                relatedProjectId: projectId);

            if (serviceManagerId.HasValue && serviceManagerId.Value != projectManagerId)
            {
                await CreateNotificationAsync(
                    userId: serviceManagerId.Value,
                    title: "Nouveau Projet dans le Service",
                    message: message,
                    type: NotificationType.ProjectAdded,
                    category: NotificationCategory.ProjectUpdate,
                    link: link,
                    relatedProjectId: projectId);
            }

            if (adminUserId.HasValue && adminUserId.Value != projectManagerId && adminUserId.Value != serviceManagerId)
            {
                await CreateNotificationAsync(
                    userId: adminUserId.Value,
                    title: "Nouveau Projet Créé",
                    message: message,
                    type: NotificationType.ProjectAdded,
                    category: NotificationCategory.ProjectUpdate,
                    link: link,
                    relatedProjectId: projectId);
            }

            return pmNotification;
        }

        public async System.Threading.Tasks.Task<Notification> NotifySprintAddedAsync(int sprintId, int projectManagerId,
            int? serviceManagerId = null, int? adminUserId = null, int? createdByUserId = null)
        {
            var sprint = await _context.Set<Sprint>()
                .Include(s => s.Project)
                .FirstOrDefaultAsync(s => s.Id == sprintId);

            if (sprint == null)
                throw new InvalidOperationException("Sprint non trouvé");

            var projectName = sprint.Project?.name ?? $"Projet #{sprint.ProjectId}";
            var link = $"/sprints/{sprintId}";
            var message = $"Un nouveau sprint '{sprint.Name}' a été créé pour le projet '{projectName}'.";

            if (createdByUserId.HasValue)
            {
                var creator = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == createdByUserId.Value);
                if (creator != null)
                {
                    message = $"Un nouveau sprint '{sprint.Name}' a été créé pour le projet '{projectName}' par {creator.FirstName} {creator.LastName} ({creator.role}).";
                }
            }

            var pmNotification = await CreateNotificationAsync(
                userId: projectManagerId,
                title: "Nouveau Sprint Créé",
                message: message,
                type: NotificationType.ProjectAdded,
                category: NotificationCategory.ProjectUpdate,
                link: link,
                relatedProjectId: sprint.ProjectId,
                newValue: sprint.Name);

            if (serviceManagerId.HasValue && serviceManagerId.Value != projectManagerId)
            {
                await CreateNotificationAsync(
                    userId: serviceManagerId.Value,
                    title: "Nouveau Sprint dans le Service",
                    message: message,
                    type: NotificationType.ProjectAdded,
                    category: NotificationCategory.ProjectUpdate,
                    link: link,
                    relatedProjectId: sprint.ProjectId,
                    newValue: sprint.Name);
            }

            if (adminUserId.HasValue && adminUserId.Value != projectManagerId && adminUserId.Value != serviceManagerId)
            {
                await CreateNotificationAsync(
                    userId: adminUserId.Value,
                    title: "Nouveau Sprint Créé",
                    message: message,
                    type: NotificationType.ProjectAdded,
                    category: NotificationCategory.ProjectUpdate,
                    link: link,
                    relatedProjectId: sprint.ProjectId,
                    newValue: sprint.Name);
            }

            return pmNotification;
        }

        public async System.Threading.Tasks.Task<Notification> NotifyUserRoleChangedAsync(int changedUserId, int changedByUserId,
            string oldRole, string newRole)
        {
            var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == changedUserId);
            if (user == null)
                throw new InvalidOperationException("Utilisateur non trouvé");

            var title = "Modification de Rôle";
            var message = $"Votre rôle a été modifié: {oldRole} → {newRole}";
            var link = $"/profile";

            var notification = await CreateNotificationAsync(
                userId: changedUserId,
                title: title,
                message: message,
                type: NotificationType.UserRoleChanged,
                category: NotificationCategory.UserUpdate,
                link: link,
                relatedUserId: changedByUserId,
                oldValue: oldRole,
                newValue: newRole);

            return notification;
        }

        public async System.Threading.Tasks.Task<Notification> NotifyTaskDeadlineAsync(int taskId, int assignedToId,
            int projectManagerId, string urgencyLevel)
        {
            var task = await _context.Set<DomainTask>().FirstOrDefaultAsync(t => t.Id == taskId);
            if (task == null)
                throw new InvalidOperationException("Tâche non trouvée");

            var title = urgencyLevel == "OVERDUE" ? "Tâche Dépassée" : "Date Limite Approchante";
            var message = urgencyLevel == "OVERDUE"
                ? $"La tâche '{task.Title}' a dépassé sa date limite!"
                : $"La date limite pour la tâche '{task.Title}' approche! Date limite: {task.EndDate:dd/MM/yyyy}";

            var link = $"/tasks/{taskId}";
            var notificationType = urgencyLevel == "OVERDUE" ? NotificationType.TaskOverdue : NotificationType.TaskDeadlineApproaching;

            var assignedUser = assignedToId > 0
                ? await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == assignedToId)
                : null;

            var recipients = new HashSet<int>();
            if (assignedToId > 0)
            {
                recipients.Add(assignedToId);
            }

            if (projectManagerId > 0)
            {
                recipients.Add(projectManagerId);
            }

            var observerIds = await _context.Set<User>()
                .Where(user => user.role == UserRole.Observer)
                .Select(user => user.Id)
                .ToListAsync();

            foreach (var observerId in observerIds)
            {
                if (observerId > 0)
                {
                    recipients.Add(observerId);
                }
            }

            Notification? firstNotification = null;
            foreach (var recipientId in recipients)
            {
                var recipientMessage = recipientId == assignedToId
                    ? message
                    : recipientId == projectManagerId
                        ? $"La tâche '{task.Title}' assignée à {assignedUser?.FirstName ?? "l'utilisateur"} " +
                          (urgencyLevel == "OVERDUE" ? "a dépassé sa date limite!" : "approche de sa date limite!")
                        : $"La tâche '{task.Title}' du projet est { (urgencyLevel == "OVERDUE" ? "en retard" : "proche de sa date limite") }.";

                var notification = await CreateNotificationAsync(
                    userId: recipientId,
                    title: title,
                    message: recipientMessage,
                    type: notificationType,
                    category: NotificationCategory.Deadline,
                    link: link,
                    relatedTaskId: taskId,
                    relatedUserId: assignedToId > 0 ? assignedToId : null,
                    newValue: urgencyLevel);

                firstNotification ??= notification;
            }

            return firstNotification ?? throw new InvalidOperationException("Aucun destinataire valide pour la notification d'échéance");
        }

        public async System.Threading.Tasks.Task SendUnreadNotificationEmailsAsync(int daysOld = 1)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-daysOld);

            var unreadNotifications = await _context.Set<Notification>()
                .Where(n => !n.IsRead && n.CreatedAt < cutoffDate && !n.EmailSent)
                .GroupBy(n => n.UserId)
                .ToListAsync();

            foreach (var userNotifications in unreadNotifications)
            {
                var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == userNotifications.Key);
                if (user != null)
                {
                    var notificationsList = userNotifications.OrderByDescending(n => n.CreatedAt).ToList();
                    var subject = $"Rappel: {notificationsList.Count} Notifications Non Lues";
                    var body = GenerateUnreadNotificationsEmailBody(user.FirstName, notificationsList);

                    await SendNotificationEmailAsync(user.Email, subject, body);

                    foreach (var notification in notificationsList)
                    {
                        notification.EmailSent = true;
                        notification.EmailSentAt = DateTime.UtcNow;
                        _context.Set<Notification>().Update(notification);
                    }
                    await _context.SaveChangesAsync(default);
                }
            }
        }

        public async System.Threading.Tasks.Task SendOverdueTaskEmailsAsync()
        {
            var allTasks = await _context.Set<DomainTask>()
                .Include(t => t.AssignedTo)
                .Where(t => t.EndDate < DateTime.UtcNow && t.Status != State.done && t.Status != State.validated)
                .ToListAsync();

            foreach (var task in allTasks)
            {
                if (!task.AssignedToId.HasValue)
                {
                    continue;
                }

                var assignedUser = task.AssignedTo ?? await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == task.AssignedToId.Value);
                if (assignedUser == null)
                {
                    continue;
                }

                var subject = $"Alert: Tâche Dépassée - {task.Title}";
                var body = $@"
                    <h2>Tâche Dépassée</h2>
                    <p>Bonjour {assignedUser.FirstName},</p>
                    <p>La tâche <strong>{task.Title}</strong> n'est pas terminée et a dépassé sa date limite.</p>
                    <p><strong>Date limite:</strong> {task.EndDate:dd/MM/yyyy HH:mm}</p>
                    <p><strong>Description:</strong> {task.Description}</p>
                    <p>Veuillez la terminer dès que possible.</p>
                ";

                await SendNotificationEmailAsync(assignedUser.Email, subject, body);
            }
        }

        public async System.Threading.Tasks.Task<IEnumerable<Notification>> GetUserNotificationsAsync(int userId, bool onlyUnread = false)
        {
            var query = _context.Set<Notification>().Where(n => n.UserId == userId);

            if (onlyUnread)
                query = query.Where(n => !n.IsRead);

            return await query.OrderByDescending(n => n.CreatedAt).ToListAsync();
        }

        public async System.Threading.Tasks.Task<IEnumerable<Notification>> GetConversationAsync(int currentUserId, int otherUserId)
        {
            return await _context.Set<Notification>()
                .Where(n =>
                    (n.UserId == currentUserId && n.RelatedUserId == otherUserId)
                    || (n.UserId == otherUserId && n.RelatedUserId == currentUserId))
                .OrderBy(n => n.CreatedAt)
                .ToListAsync();
        }

        public async System.Threading.Tasks.Task PublishUserNotificationsAsync(int userId)
        {
            if (userId <= 0)
            {
                return;
            }

            var notifications = await _context.Set<Notification>()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            var unreadCount = notifications.Count(n => !n.IsRead);

            await _hubContext.Clients.Group(NotificationHub.GetUserGroup(userId))
                .SendAsync("NotificationsUpdated", notifications, unreadCount);
        }

        private async System.Threading.Tasks.Task SendNotificationEmailAsync(string toEmail, string subject, string message)
        {
            try
            {
                var htmlBody = $@"
                    <html>
                        <head>
                            <style>
                                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }}
                                .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                                .content {{ padding: 20px; }}
                                .footer {{ background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }}
                            </style>
                        </head>
                        <body>
                            <div class='container'>
                                <div class='header'>
                                    <h2>{subject}</h2>
                                </div>
                                <div class='content'>
                                    {message}
                                </div>
                                <div class='footer'>
                                    <p>Ceci est un email automatique. Veuillez ne pas y répondre.</p>
                                </div>
                            </div>
                        </body>
                    </html>
                ";

                await _emailService.SendEmailAsync(toEmail, subject, htmlBody);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors de l'envoi de l'email à {toEmail}: {ex.Message}");
            }
        }

        private string GenerateUnreadNotificationsEmailBody(string userName, List<Notification> notifications)
        {
            var notificationsHtml = string.Join(Environment.NewLine, notifications.Take(10).Select(n =>
                $@"<li><strong>{n.Title}</strong> - {n.Message} (créée le {n.CreatedAt:dd/MM/yyyy HH:mm})</li>"
            ));

            return $@"
                <p>Bonjour {userName},</p>
                <p>Vous avez <strong>{notifications.Count}</strong> notifications non lues:</p>
                <ul>
                    {notificationsHtml}
                </ul>
                <p><a href='https:
            ";
        }
    }
}
