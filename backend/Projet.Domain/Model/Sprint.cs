using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Model
{
    public class Sprint
    {
        public Guid Id { get; set; }
        public String Name { get; set; }
        public string Description { get; set; }
        public int estimatedDuration { get; set; }
        public DateTime startDate { get; set; }
        public DateTime endDate { get; set; }
        public State SprintState { get; set; }
        public Guid ProjectId { get; set; }
        public virtual Project Project { get; set; }
    }
}
