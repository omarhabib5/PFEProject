using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Model
{
    public class TeamUser
    {
        public Role role { get; set; }
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LeftAt { get; set; }

        public Guid UserId { get; set; }
        public Guid TeamId { get; set; }


        public virtual User User { get; set; }
        public virtual Team team { get; set; }
    }
}
