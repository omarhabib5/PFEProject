using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Model
{
    public class Task
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int EstimatedHours { get; set; }
        public int? ActualHours { get; set; }
        public State Status { get; set; }
        public int Complexity { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int UserStoryId { get; set; }
        public int? SprintId { get; set; }
        public int? AssignedToId { get; set; }
        public virtual UserStory UserStory { get; set; } = null!;
        public virtual Sprint? Sprint { get; set; }
        public virtual User? AssignedTo { get; set; }
    }
}
