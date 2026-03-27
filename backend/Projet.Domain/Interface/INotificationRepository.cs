using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Projet.Domain.Interface
{
    public interface INotificationRepository
    {
        Task<List<Model.Notification>> GetByUserIdAsync(int userId, CancellationToken cancellationToken);
        Task<Model.Notification?> GetByIdAsync(int notificationId, CancellationToken cancellationToken);
        Task UpdateAsync(Model.Notification notification, CancellationToken cancellationToken);
        Task DeleteAsync(Model.Notification notification, CancellationToken cancellationToken);
    }
}