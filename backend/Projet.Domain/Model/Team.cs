using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Model
{
    public class Team
    {
        public int id { get; set; }
        public string name { get; set; }
        public int ServiceId { get; set; }  
        public virtual Service Service { get; set; }
        public virtual ICollection<TeamUser> TeamUsers { get; set; }
        public virtual ICollection<Project> Projects { get; set; }
    }
}
