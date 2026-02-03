using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Model
{
    public   class UserStory
    {
        public int id { get; set; }
        public string name { get; set; }
        public string description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int estimatedDuration { get; set; }
        public State UserStoryState { get; set; }
         public int SprintId { get; set; }
        public virtual Sprint Sprint { get; set; }
        public int ProjectId { get; set; }
        public virtual Project Project { get; set; }
    }
}
