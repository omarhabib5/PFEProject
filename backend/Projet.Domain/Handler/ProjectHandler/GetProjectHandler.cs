using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MediatR;
using Projet.Domain.Interface;
using Projet.Domain.Model;
using Projet.Domain.Querie;

namespace Projet.Domain.Handler.ProjectHandler
{
    public class GetProjectByIdHandler : IRequestHandler<GetProjectByIdQuery, Project>
    {
        private readonly IApplicationDbSet context;

        public GetProjectByIdHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<Project> Handle(GetProjectByIdQuery request, CancellationToken cancellationToken)
        {
            var project = await context.Projects.FirstOrDefaultAsync(p => p.id == request.Id);
            
            if (project == null)
            {
                throw new KeyNotFoundException($"Project with ID {request.Id} not found.");
            }

            return project;
        }
    }

    public class GetAllProjectsHandler : IRequestHandler<GetAllProjectsQuery, List<Project>>
    {
        private readonly IApplicationDbSet context;

        public GetAllProjectsHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<List<Project>> Handle(GetAllProjectsQuery request, CancellationToken cancellationToken)
        {
            return await context.Projects.ToListAsync();
        }
    }
}
