using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Querie.UserStory
{
    public class GetUserStoryByProjectIdQuery : IRequest<List<Model.UserStory>>
    {
        public int ProjectId { get; set; }

        public GetUserStoryByProjectIdQuery(int projectId)
        {
            ProjectId = projectId;
        }
    }
}
