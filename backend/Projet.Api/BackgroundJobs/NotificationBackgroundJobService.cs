using System;
using System.Threading;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Projet.Application.Context;
using Projet.Domain.Model;
using Projet.Infrastructure.Service;

namespace Projet.Api.BackgroundJobs
{
    
    
    
    
    
    
    public class NotificationBackgroundJobService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<NotificationBackgroundJobService> _logger;
        private Timer? _timer;

        
        private const int UNREAD_REMINDER_CHECK_INTERVAL = 60; 
        private const int OVERDUE_TASK_CHECK_INTERVAL = 60; 
        private const int TASK_DEADLINE_WARNING_INTERVAL = 120; 

        public NotificationBackgroundJobService(IServiceProvider serviceProvider, ILogger<NotificationBackgroundJobService> logger)
        {
            _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        protected override async System.Threading.Tasks.Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Background notification service is starting...");

            
            _timer = new Timer(
                callback: async _ => await CheckAndSendNotificationsAsync(),
                state: null,
                dueTime: TimeSpan.Zero, 
                period: TimeSpan.FromMinutes(UNREAD_REMINDER_CHECK_INTERVAL));

            await System.Threading.Tasks.Task.CompletedTask;
        }

        private async System.Threading.Tasks.Task CheckAndSendNotificationsAsync()
        {
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    if (!await dbContext.Database.CanConnectAsync())
                    {
                        _logger.LogWarning("Database is unavailable. Notification check postponed.");
                        return;
                    }

                    var pendingMigrations = await dbContext.Database.GetPendingMigrationsAsync();
                    if (pendingMigrations.Any())
                    {
                        _logger.LogWarning("Pending migrations detected ({Count}). Notification check postponed.", pendingMigrations.Count());
                        return;
                    }

                    var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

                    
                    try
                    {
                        _logger.LogInformation("Checking unread notifications from the last day...");
                        await notificationService.SendUnreadNotificationEmailsAsync(daysOld: 1);
                        _logger.LogInformation("Reminder emails sent successfully");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Error while sending reminder emails: {ex.Message}");
                    }

                    
                    try
                    {
                        _logger.LogInformation("Checking overdue tasks...");
                        await notificationService.SendOverdueTaskEmailsAsync();
                        _logger.LogInformation("Overdue task emails sent successfully");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Error while sending overdue task emails: {ex.Message}");
                    }

                    
                    try
                    {
                        _logger.LogInformation("Checking upcoming deadlines...");
                        await SendUpcomingDeadlineAlertsAsync(notificationService);
                        _logger.LogInformation("Upcoming deadline alerts sent successfully");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Error while sending deadline alerts: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Critical error in the background notification service: {ex}");
            }
        }

        private async System.Threading.Tasks.Task SendUpcomingDeadlineAlertsAsync(INotificationService notificationService)
        {
            var now = DateTime.UtcNow;
            var cutoff = now.AddDays(3);

            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var upcomingTasks = await dbContext.Tasks
                .Include(task => task.AssignedTo)
                .Include(task => task.UserStory)
                    .ThenInclude(userStory => userStory.Project)
                .Where(task =>
                    task.EndDate >= now &&
                    task.EndDate <= cutoff &&
                    task.Status != State.done &&
                    task.Status != State.validated)
                .ToListAsync();

            var observerIds = await dbContext.Users
                .Where(user => user.role == UserRole.Observer)
                .Select(user => user.Id)
                .ToListAsync();

            foreach (var task in upcomingTasks)
            {
                var projectManagerId = task.UserStory?.Project?.ProjectManagerId;
                var assignedToId = task.AssignedToId ?? 0;
                var pmId = projectManagerId ?? 0;

                var recipientIds = new List<int>();
                if (assignedToId > 0)
                {
                    recipientIds.Add(assignedToId);
                }
                if (pmId > 0 && pmId != assignedToId)
                {
                    recipientIds.Add(pmId);
                }
                foreach (var observerId in observerIds)
                {
                    if (observerId > 0 && observerId != assignedToId && observerId != pmId)
                    {
                        recipientIds.Add(observerId);
                    }
                }

                if (recipientIds.Count == 0)
                {
                    continue;
                }

                var alreadyNotified = await dbContext.Set<Notification>()
                    .AnyAsync(notification =>
                        notification.RelatedTaskId == task.Id &&
                        recipientIds.Contains(notification.UserId) &&
                        notification.Type == NotificationType.TaskDeadlineApproaching &&
                        notification.NewValue == "UPCOMING");

                if (alreadyNotified)
                {
                    continue;
                }

                try
                {
                    await notificationService.NotifyTaskDeadlineAsync(
                        taskId: task.Id,
                        assignedToId: assignedToId,
                        projectManagerId: pmId,
                        urgencyLevel: "UPCOMING");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while sending the deadline alert for task {TaskId}", task.Id);
                }
            }
        }

        public override async System.Threading.Tasks.Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Background notification service is stopping...");
            _timer?.Change(Timeout.Infinite, 0);
            _timer?.Dispose();
            await base.StopAsync(cancellationToken);
        }

        public override void Dispose()
        {
            _timer?.Dispose();
            base.Dispose();
        }
    }
}
