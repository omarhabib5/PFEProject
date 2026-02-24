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
    public class GetUserStoryByProjectIdHandler : IRequestHandler<GetUserStoryByProjectIdQuery, List<Model.UserStory>>
    {
        private readonly IApplicationDbSet context;

        public GetUserStoryByProjectIdHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<List<Model.UserStory>> Handle(GetUserStoryByProjectIdQuery request, CancellationToken cancellationToken)
        {
            return await context.UserStories
                .Include(us => us.Sprint)
                .Include(us => us.Project)
                .Include(us => us.Tasks)
                .Where(us => us.ProjectId == request.ProjectId)
                .ToListAsync(cancellationToken);
        }
    }
}
