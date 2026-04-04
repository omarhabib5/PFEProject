using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Projet.Domain.Model;

namespace Projet.Application.DTOs.UserStory
{
    public class UpdateUserStoryRequest
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? AcceptanceCriteria { get; set; }
        public int? StoryPoints { get; set; }
        public int? Priority { get; set; }
        public int? AssignedToId { get; set; }
        public int? SprintId { get; set; }
        public State? Status { get; set; }
        public int? EstimatedDuration { get; set; }
    }
}
