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
                throw new InvalidOperationException("Task not found");

            var title = "Task Status Change";
            var link = $"/tasks/{taskId}";

            Notification? employeeNotification = null;
            if (assignedToId > 0)
            {
                var employeeMessage = newStatus.Equals(nameof(State.pending), StringComparison.OrdinalIgnoreCase)
                    ? $"Your task '{task.Title}' is marked as not confirmed."
                    : newStatus.Equals(nameof(State.validated), StringComparison.OrdinalIgnoreCase)
                        ? $"Your task '{task.Title}' has been validated."
                        : newStatus.Equals(nameof(State.done), StringComparison.OrdinalIgnoreCase)
                            ? $"Your task '{task.Title}' is marked as completed."
                            : $"Task '{task.Title}' has changed status: {oldStatus} → {newStatus}";

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
                var pmMessage = $"Task '{task.Title}' has changed status: {oldStatus} → {newStatus}";

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
                ?? throw new InvalidOperationException("No valid recipient found for the task status notification");
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
                throw new InvalidOperationException("Task not found");
            }

            var projectName = task.UserStory?.Project?.name ?? "Project";
            var link = $"/tasks/{taskId}";
            var title = "Task Assigned";
            var assignedUserName = task.AssignedTo != null
                ? $"{task.AssignedTo.FirstName} {task.AssignedTo.LastName}".Trim()
                : "l'employé";

            Notification? assigneeNotification = null;
            if (assignedToId > 0)
            {
                assigneeNotification = await CreateNotificationAsync(
                    userId: assignedToId,
                    title: title,
                    message: $"A task '{task.Title}' has been assigned to you on project '{projectName}'.",
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
                    message: $"Task '{task.Title}' has been assigned to {assignedUserName} in project '{projectName}'.",
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
                ?? throw new InvalidOperationException("No valid recipient found for the task assignment notification");
        }

        public async System.Threading.Tasks.Task<Notification> NotifyTaskAddedAsync(int taskId)
        {
            var task = await _context.Set<DomainTask>()
                .Include(t => t.UserStory)
                    .ThenInclude(us => us.Project)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null)
            {
                throw new InvalidOperationException("Task not found");
            }

            var title = "New Task Assigned";
            var link = $"/tasks/{taskId}";
            var message = $"A new task '{task.Title}' has been added.";

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
                    ? $"A new task '{task.Title}' has been assigned to you."
                    : recipientId == projectManagerId
                        ? $"A new task '{task.Title}' has been added to the project."
                        : $"A new task '{task.Title}' has been added to project '{task.UserStory?.Project?.name ?? "Project"}'.";

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

            return firstNotification ?? throw new InvalidOperationException("No valid recipient found for the task creation notification");
        }

        public async System.Threading.Tasks.Task<Notification> NotifyUserStoryAddedAsync(int userStoryId, int projectManagerId,
            int assignedToId)
        {
            var userStory = await _context.Set<UserStory>().FirstOrDefaultAsync(us => us.Id == userStoryId);
            if (userStory == null)
                throw new InvalidOperationException("User story not found");

            var title = "New User Story Assigned";
            var message = $"A new user story '{userStory.Title}' has been assigned to you and must be completed.";
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
                throw new InvalidOperationException("Project not found");

            var link = $"/projects/{projectId}";
            var message = $"A new project '{project.name}' has been created.";

            if (createdByUserId.HasValue)
            {
                var creator = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == createdByUserId.Value);
                if (creator != null)
                {
                    message = $"A new project '{project.name}' has been created by {creator.FirstName} {creator.LastName} ({creator.role}).";
                }
            }

            
            var pmNotification = await CreateNotificationAsync(
                userId: projectManagerId,
                title: "New Project Created",
                message: message,
                type: NotificationType.ProjectAdded,
                category: NotificationCategory.ProjectUpdate,
                link: link,
                relatedProjectId: projectId);

            if (serviceManagerId.HasValue && serviceManagerId.Value != projectManagerId)
            {
                await CreateNotificationAsync(
                    userId: serviceManagerId.Value,
                    title: "New Project in Service",
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
                    title: "New Project Created",
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
                throw new InvalidOperationException("Sprint not found");

            var projectName = sprint.Project?.name ?? $"Project #{sprint.ProjectId}";
            var link = $"/sprints/{sprintId}";
            var message = $"A new sprint '{sprint.Name}' has been created for project '{projectName}'.";

            if (createdByUserId.HasValue)
            {
                var creator = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == createdByUserId.Value);
                if (creator != null)
                {
                    message = $"A new sprint '{sprint.Name}' has been created for project '{projectName}' by {creator.FirstName} {creator.LastName} ({creator.role}).";
                }
            }

            var pmNotification = await CreateNotificationAsync(
                userId: projectManagerId,
                title: "New Sprint Created",
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
                    title: "New Sprint in Service",
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
                    title: "New Sprint Created",
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
                throw new InvalidOperationException("User not found");

            var title = "Role Changed";
            var message = $"Your role has been changed: {oldRole} → {newRole}";
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
                throw new InvalidOperationException("Task not found");

            var title = urgencyLevel == "OVERDUE" ? "Task Overdue" : "Upcoming Deadline";
            var message = urgencyLevel == "OVERDUE"
                ? $"The task '{task.Title}' has exceeded its deadline!"
                : $"The deadline for task '{task.Title}' is approaching! Deadline: {task.EndDate:dd/MM/yyyy}";

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
                        ? $"Task '{task.Title}' assigned to {assignedUser?.FirstName ?? "the user"} " +
                          (urgencyLevel == "OVERDUE" ? "has exceeded its deadline!" : "is approaching its deadline!")
                        : $"Task '{task.Title}' from the project is { (urgencyLevel == "OVERDUE" ? "overdue" : "approaching its deadline") }.";

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

            return firstNotification ?? throw new InvalidOperationException("No valid recipient found for the deadline notification");
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
                    var subject = $"Reminder: {notificationsList.Count} Unread Notifications";
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

                var subject = $"Alert: Overdue Task - {task.Title}";
                var body = $@"
                    <h2>Overdue Task</h2>
                    <p>Hello {assignedUser.FirstName},</p>
                    <p>The task <strong>{task.Title}</strong> is not completed and has exceeded its deadline.</p>
                    <p><strong>Deadline:</strong> {task.EndDate:dd/MM/yyyy HH:mm}</p>
                    <p><strong>Description:</strong> {task.Description}</p>
                    <p>Please complete it as soon as possible.</p>
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
                                    <p>This is an automated email. Please do not reply.</p>
                                </div>
                            </div>
                        </body>
                    </html>
                ";

                await _emailService.SendEmailAsync(toEmail, subject, htmlBody);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error while sending the email to {toEmail}: {ex.Message}");
            }
        }

        private string GenerateUnreadNotificationsEmailBody(string userName, List<Notification> notifications)
        {
            var notificationsHtml = string.Join(Environment.NewLine, notifications.Take(10).Select(n =>
                $@"<li><strong>{n.Title}</strong> - {n.Message} (created on {n.CreatedAt:dd/MM/yyyy HH:mm})</li>"
            ));

            return $@"
                <p>Hello {userName},</p>
                <p>You have <strong>{notifications.Count}</strong> unread notifications:</p>
                <ul>
                    {notificationsHtml}
                </ul>
                <p><a href='https:
            ";
        }
    }
}
