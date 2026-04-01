using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Projet.Application.Context;
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

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Service de notifications de fond en cours de démarrage...");

            
            _timer = new Timer(
                callback: async _ => await CheckAndSendNotificationsAsync(),
                state: null,
                dueTime: TimeSpan.Zero, 
                period: TimeSpan.FromMinutes(UNREAD_REMINDER_CHECK_INTERVAL));

            await Task.CompletedTask;
        }

        private async Task CheckAndSendNotificationsAsync()
        {
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    if (!await dbContext.Database.CanConnectAsync())
                    {
                        _logger.LogWarning("Base de données indisponible. Vérification des notifications reportée.");
                        return;
                    }

                    var pendingMigrations = await dbContext.Database.GetPendingMigrationsAsync();
                    if (pendingMigrations.Any())
                    {
                        _logger.LogWarning("Migrations en attente détectées ({Count}). Vérification des notifications reportée.", pendingMigrations.Count());
                        return;
                    }

                    var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

                    
                    try
                    {
                        _logger.LogInformation("Vérification des notifications non lues depuis 1 jour...");
                        await notificationService.SendUnreadNotificationEmailsAsync(daysOld: 1);
                        _logger.LogInformation("Emails de rappel envoyés avec succès");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Erreur lors de l'envoi des emails de rappel: {ex.Message}");
                    }

                    
                    try
                    {
                        _logger.LogInformation("Vérification des tâches en retard...");
                        await notificationService.SendOverdueTaskEmailsAsync();
                        _logger.LogInformation("Emails pour tâches en retard envoyés avec succès");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Erreur lors de l'envoi des emails pour tâches en retard: {ex.Message}");
                    }

                    
                    try
                    {
                        _logger.LogInformation("Vérification des dates limites approchantes...");
                        await SendUpcomingDeadlineAlertsAsync(notificationService);
                        _logger.LogInformation("Alertes de dates limites approchantes envoyées");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Erreur lors de l'envoi des alertes de dates limites: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erreur critique dans le service de notifications de fond: {ex}");
            }
        }

        private async Task SendUpcomingDeadlineAlertsAsync(INotificationService notificationService)
        {
            
            
            
            await Task.CompletedTask;
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Service de notifications de fond en cours d'arrêt...");
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
