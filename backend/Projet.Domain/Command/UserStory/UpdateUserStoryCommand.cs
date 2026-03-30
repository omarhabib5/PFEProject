using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Command.UserStory
{
    public class UpdateUserStoryCommand : IRequest<Unit>
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? AcceptanceCriteria { get; set; }
        public int? StoryPoints { get; set; }
        public int? Priority { get; set; }
        public int? AssignedToId { get; set; }
    }
}
