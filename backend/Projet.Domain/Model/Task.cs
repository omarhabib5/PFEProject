using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Model
{
  public  class Task
    {
        public int id { get; set; }
        public string Name { get; set; }
        public string description { get; set; }
        public int EstimationDuration { get; set; }
        public DateTime StartDate{ get; set; }
        public DateTime EndDate { get; set; }
        public State taskState { get; set; }
        public int complexity { get; set; }

        public int UserStoryId { get; set; }
        public int? SprintId { get; set; }

        public virtual Sprint Sprint { get; set; }
        public virtual UserStory UserStory { get; set; }

        public int? AssignedToId { get; set; }
        public virtual User AssignedTo { get; set; }


    }
}
