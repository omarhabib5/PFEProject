using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Model;

namespace Projet.Infrastructure.Repository
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly IApplicationDbSet _context;

        public NotificationRepository(IApplicationDbSet context)
        {
            _context = context;
        }

        public async System.Threading.Tasks.Task<List<Notification>> GetByUserIdAsync(int userId, CancellationToken cancellationToken)
        {
            return await _context.Set<Notification>()
                .Where(n => n.UserId == userId)
                .ToListAsync(cancellationToken);
        }

        public async System.Threading.Tasks.Task<Notification?> GetByIdAsync(int notificationId, CancellationToken cancellationToken)
        {
            return await _context.Set<Notification>()
                .FirstOrDefaultAsync(n => n.Id == notificationId, cancellationToken);
        }

        public async System.Threading.Tasks.Task UpdateAsync(Notification notification, CancellationToken cancellationToken)
        {
            _context.Set<Notification>().Update(notification);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async System.Threading.Tasks.Task DeleteAsync(Notification notification, CancellationToken cancellationToken)
        {
            _context.Set<Notification>().Remove(notification);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
