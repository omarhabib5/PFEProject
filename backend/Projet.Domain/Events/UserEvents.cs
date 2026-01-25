using Projet.Domain.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Events
{
    public  class UserCreatedEvent:BaseEntity
    {
        public Guid UserId { get; }
        public string Email { get; }

        public UserCreatedEvent(Guid userId, string email)
        {
            UserId = userId;
            Email = email;
        }
    }
    public class UserLoggedInEvent:BaseEntity
    {
        public Guid UserId { get; }
        public DateTime LoginTime { get; }
        public UserLoggedInEvent(Guid userId, DateTime loginTime)
        {
            UserId = userId;
            LoginTime = loginTime;
        }
    }
}
