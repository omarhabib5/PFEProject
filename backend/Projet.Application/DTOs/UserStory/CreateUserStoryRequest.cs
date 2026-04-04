using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Projet.Domain.Model;

namespace Projet.Application.DTOs.UserStory
{
    public class CreateUserStoryRequest
    {
        [Required(ErrorMessage = "Title is required")]
        [MaxLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;
        public string AcceptanceCriteria { get; set; } = string.Empty;
        [Range(1, 100)]
        public int StoryPoints { get; set; }
        [Range(1, 5)]
        public int Priority { get; set; }
        [Required]
        public int SprintId { get; set; }
        public int? AssignedToId { get; set; }
        public State? Status { get; set; }
        public int? EstimatedDuration { get; set; }
    }
}
