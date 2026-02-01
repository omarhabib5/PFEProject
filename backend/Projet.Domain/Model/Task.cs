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

        public Guid UserStoryId { get; set; }
        public virtual UserStory UserStory { get; set; }


    }
}
