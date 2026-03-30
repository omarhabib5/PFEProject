using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Model
{
    public class TeamUser
    {
        
        public int Id { get; set; }  
        
        public Role role { get; set; }
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LeftAt { get; set; }

        public int UserId { get; set; }
        public int  TeamId { get; set; }


        public virtual User User { get; set; }
        public virtual Team team { get; set; }
    }
}
