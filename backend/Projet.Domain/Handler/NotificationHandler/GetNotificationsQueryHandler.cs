
using MediatR;
using Projet.Domain.Interface;
using Projet.Domain.Querie.Notification;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Projet.Domain.Handler.NotificationHandler
{
    public class GetNotificationsQueryHandler : IRequestHandler<GetNotificationsQuery, List<Model.Notification>>
    {
        private readonly INotificationRepository _notificationRepository;

        public GetNotificationsQueryHandler(INotificationRepository notificationRepository)
        {
            _notificationRepository = notificationRepository;
        }

        public async Task<List<Model.Notification>> Handle(
            GetNotificationsQuery request,
            CancellationToken cancellationToken)
        {
            var notifications = await _notificationRepository
                .GetByUserIdAsync(request.UserId, cancellationToken);

            return notifications
                .OrderByDescending(n => n.CreatedAt)
                .ToList();
        }
    }
}