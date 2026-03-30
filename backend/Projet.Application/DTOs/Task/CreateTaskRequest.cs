using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Application.DTOs.Task
{
    public class CreateTaskRequest
    {
        [Required]
        [StringLength(100, MinimumLength = 3)]
        public string Title { get; set; } = string.Empty;
        [Required]
        public string Description { get; set; } = string.Empty;

        [Range(1, 1000)]
        public int EstimatedHours { get; set; }
        [Required]
        public int UserStoryId { get; set; }
        public int? AssignedToId { get; set; }
    }
}
