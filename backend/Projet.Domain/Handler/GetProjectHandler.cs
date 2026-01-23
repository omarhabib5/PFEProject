using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Interface;
using Projet.Domain.Model;
using Projet.Domain.Querie;

namespace Projet.Domain.Handler
{
    public class GetProjectByIdHandler : IRequestHandler<GetProjectByIdQuery, ProjectModel>
    {
        private readonly IApplicationDbSet context;

        public GetProjectByIdHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<ProjectModel> Handle(GetProjectByIdQuery request, CancellationToken cancellationToken)
        {
            var project = context.Projects.FirstOrDefault(p => p.id == request.Id);
            
            if (project == null)
            {
                throw new KeyNotFoundException($"Project with ID {request.Id} not found.");
            }

            return project;
        }
    }

    public class GetAllProjectsHandler : IRequestHandler<GetAllProjectsQuery, List<ProjectModel>>
    {
        private readonly IApplicationDbSet context;

        public GetAllProjectsHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<List<ProjectModel>> Handle(GetAllProjectsQuery request, CancellationToken cancellationToken)
        {
            return context.Projects.ToList();
        }
    }
}
