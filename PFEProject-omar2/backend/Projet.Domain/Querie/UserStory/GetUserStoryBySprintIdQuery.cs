using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Querie.UserStory
{
    public class GetUserStoryBySprintIdQuery : IRequest<List<Model.UserStory>>
    {
        public int SprintId { get; set; }

        public GetUserStoryBySprintIdQuery(int sprintId)
        {
            SprintId = sprintId;
        }
    }
}
