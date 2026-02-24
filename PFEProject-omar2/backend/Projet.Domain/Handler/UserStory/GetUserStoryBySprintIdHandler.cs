using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Querie.UserStory;
using Projet.Domain.Interface;
using Microsoft.EntityFrameworkCore;

namespace Projet.Domain.Handler.UserStory
{
    public class GetUserStoryBySprintIdHandler : IRequestHandler<GetUserStoryBySprintIdQuery, List<Model.UserStory>>
    {
        private readonly IApplicationDbSet context;

        public GetUserStoryBySprintIdHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<List<Model.UserStory>> Handle(GetUserStoryBySprintIdQuery request, CancellationToken cancellationToken)
        {
            return await context.UserStories
                .Include(us => us.Sprint)
                .Include(us => us.Project)
                .Include(us => us.Tasks)
                .Where(us => us.SprintId == request.SprintId)
                .ToListAsync(cancellationToken);
        }
    }
}
