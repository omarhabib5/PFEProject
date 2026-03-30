using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Model
{
    public class UserStory
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? AcceptanceCriteria { get; set; }
        public int StoryPoints { get; set; }
        public int Priority { get; set; }
        public State Status { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int EstimatedDuration { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public int SprintId { get; set; }
        public int ProjectId { get; set; }
        public int? AssignedToId { get; set; }
        public int CreatedById { get; set; }
        public virtual Sprint Sprint { get; set; } = null!;
        public virtual Project Project { get; set; } = null!;
        public virtual User? AssignedTo { get; set; }
        public virtual User CreatedBy { get; set; } = null!;
        public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();
    }
}
