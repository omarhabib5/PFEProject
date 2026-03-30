using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Querie.Notification
{
    public class GetNotificationsQuery : IRequest<List<Model.Notification>>
    {
        public int UserId { get; set; }
        public bool? IsRead { get; set; }

        public GetNotificationsQuery(int userId, bool? isRead = null)
        {
            UserId = userId;
            IsRead = isRead;
        }
    }
}