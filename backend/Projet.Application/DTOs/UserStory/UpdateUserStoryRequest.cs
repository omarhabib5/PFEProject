using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
    }
}
