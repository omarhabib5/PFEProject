using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Command.UserStory
{
    public class UpdateUserStoryCommand : IRequest<Unit>
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int EstimatedDuration { get; set; }
        public State UserStoryState { get; set; }
        public int SprintId { get; set; }
        public int ProjectId { get; set; }
    }
}
