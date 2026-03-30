using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Model
{
    public class Service
    {
        public int id { get; set; }
        public string name { get; set; }
        public int? ResponsibleId { get; set; }
        public virtual User Responsible { get; set; }


        public virtual ICollection<User> Members { get; set; }
        public virtual ICollection<Team> Teams { get; set; }
        public virtual ICollection<Project> Projects { get; set; }
    }
}
