using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Model
{
    public class Project
    {
        public int id { get; set; }
        public string name { get; set; }
        public string description { get; set; }
        public DateTime startDate { get; set; }
        public DateTime endDate { get; set; }
        public int estimatedDuration { get; set; }
        public State projectState { get; set; }
        public int? ServiceId { get; set; }
        public virtual Service Service { get; set; }
        public int ProjectManagerId { get; set; }
        public virtual User ProjectManager { get; set; }

        public int? TeamId { get; set; }
        public virtual Team Team { get; set; }

        public virtual ICollection<Sprint> Sprints { get; set; }
        public virtual ICollection<UserStory> UserStories { get; set; }



    }
}
