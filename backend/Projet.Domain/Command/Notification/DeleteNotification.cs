using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MediatR;
namespace Projet.Domain.Command.Notification
{
    public class DeleteNotificationCommand : IRequest<bool>
    {
        public int NotificationId { get; set; }
        public int UserId { get; set; }

        public DeleteNotificationCommand(int notificationId, int userId)
        {
            NotificationId = notificationId;
            UserId = userId;
        }
    }
}