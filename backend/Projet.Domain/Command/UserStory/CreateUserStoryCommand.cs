using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Command.UserStory
{
    public class CreateUserStoryCommand : IRequest<int>
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string AcceptanceCriteria { get; set; } = string.Empty;
        public int StoryPoints { get; set; }
        public int Priority { get; set; }
        public int SprintId { get; set; }
        public int? AssignedToId { get; set; }
        public int CreatedById { get; set; }
        public Projet.Domain.Model.State? Status { get; set; }
        public int? EstimatedDuration { get; set; }

    }
}
