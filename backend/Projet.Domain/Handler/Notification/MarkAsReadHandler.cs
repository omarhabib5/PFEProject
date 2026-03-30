using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Interface;
using Projet.Domain.Command.Notification;

namespace Projet.Domain.Handler.NotificationHandler
{
    public class MarkAsReadCommandHandler : IRequestHandler<MarkAsReadCommand, bool>
    {
        private readonly INotificationRepository _notificationRepository;

        public MarkAsReadCommandHandler(INotificationRepository notificationRepository)
        {
            _notificationRepository = notificationRepository;
        }

        public async Task<bool> Handle(
            MarkAsReadCommand request,
            CancellationToken cancellationToken)
        {
            var notification = await _notificationRepository
                .GetByIdAsync(request.NotificationId, cancellationToken);

            if (notification is null || notification.UserId != request.UserId)
                return false;

            if (notification.IsRead)
                return true;

            notification.IsRead = true;

            await _notificationRepository.UpdateAsync(notification, cancellationToken);

            return true;
        }
    }
}