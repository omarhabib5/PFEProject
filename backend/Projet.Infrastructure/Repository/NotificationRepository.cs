using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Interface;

namespace Projet.Infrastructure.Repository
{
    public class NotificationRepository : INotificationRepository
    {
            private readonly ApplicationDbContext _context;

    public NotificationRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<Projet.Domain.Model.Notification>> GetByUserIdAsync(
        int userId, CancellationToken cancellationToken)
    {
        return await _context.Notifications
            .Where(n => n.UserId == userId)
            .ToListAsync(cancellationToken);
    }

    public async Task<Projet.Domain.Model.Notification?> GetByIdAsync(
        int notificationId, CancellationToken cancellationToken)
    {
        return await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId, cancellationToken);
    }

    public async Task UpdateAsync(
        Projet.Domain.Model.Notification notification, CancellationToken cancellationToken)
    {
        _context.Notifications.Update(notification);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(
        Projet.Domain.Model.Notification notification, CancellationToken cancellationToken)
    {
        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
}