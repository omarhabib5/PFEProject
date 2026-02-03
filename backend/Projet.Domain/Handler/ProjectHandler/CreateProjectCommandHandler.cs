using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Command.Project;
using Projet.Domain.Interface;
using Projet.Domain.Model;

namespace Projet.Domain.Handler.ProjectHandler
{
    public class CreateProjectCommandHandler : IRequestHandler<CreateProjectCommand, int>
    {
        private readonly IApplicationDbSet context;

        public CreateProjectCommandHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<int> Handle(CreateProjectCommand request, CancellationToken cancellationToken)
        {
            var project = new Project
            {
                
                name = request.Name,
                description = request.Description,
                startDate = request.StartDate,
                endDate = request.EndDate,
                estimatedDuration = request.EstimatedDuration,
                projectState = request.ProjectState,
                ServiceId = request.ServiceId,
                TeamId = request.TeamId
            };

            context.Projects.Add(project);
            await context.SaveChangesAsync(cancellationToken);

            return project.id;
        }
    }
}
