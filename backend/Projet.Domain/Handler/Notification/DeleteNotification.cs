using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Interface;
using Projet.Domain.Command.Notification;
namespace Projet.Domain.Handler.NotificationHandler
{
    public class DeleteNotificationCommandHandler : IRequestHandler<DeleteNotificationCommand, bool>
    {
        private readonly INotificationRepository _notificationRepository;

        public DeleteNotificationCommandHandler(INotificationRepository notificationRepository)
        {
            _notificationRepository = notificationRepository;
        }

        public async Task<bool> Handle(
            DeleteNotificationCommand request,
            CancellationToken cancellationToken)
        {
            var notification = await _notificationRepository
                .GetByIdAsync(request.NotificationId, cancellationToken);

            if (notification is null || notification.UserId != request.UserId)
                return false;

            await _notificationRepository.DeleteAsync(notification, cancellationToken);

            return true;
        }
    }
}