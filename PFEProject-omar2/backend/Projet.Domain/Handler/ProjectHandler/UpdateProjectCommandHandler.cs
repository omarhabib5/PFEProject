using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MediatR;
using Projet.Domain.Command;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.ProjectHandler
{
    public class UpdateProjectCommandHandler : IRequestHandler<UpdateProjectCommand, Unit>
    {
        private readonly IApplicationDbSet context;

        public UpdateProjectCommandHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<Unit> Handle(UpdateProjectCommand request, CancellationToken cancellationToken)
        {
            if (request.EndDate <= request.StartDate)
            {
                throw new InvalidOperationException("End date must be after start date.");
            }

            var estimatedDuration = (int)Math.Ceiling((request.EndDate - request.StartDate).TotalDays);

            var project = await context.Projects.FirstOrDefaultAsync(p => p.id == request.id);

            if (project == null)
            {
                throw new KeyNotFoundException($"Project with ID {request.id} not found.");
            }

            var serviceExists = await context.Services.AnyAsync(s => s.id == request.ServiceId, cancellationToken);
            if (!serviceExists)
            {
                throw new KeyNotFoundException($"Service with ID {request.ServiceId} not found.");
            }

            var teamExists = await context.Teams.AnyAsync(t => t.id == request.TeamId, cancellationToken);
            if (!teamExists)
            {
                throw new KeyNotFoundException($"Team with ID {request.TeamId} not found.");
            }

            
            var projectManagerExists = await context.Users.AnyAsync(u => u.Id == request.ProjectManagerId, cancellationToken);
            if (!projectManagerExists)
            {
                throw new KeyNotFoundException($"User (Project Manager) with ID {request.ProjectManagerId} not found.");
            }

            project.name = request.Name;
            project.description = request.Description;
            project.startDate = request.StartDate;
            project.endDate = request.EndDate;
            project.estimatedDuration = estimatedDuration;
            project.projectState = request.ProjectState;
            project.ServiceId = request.ServiceId;
            project.TeamId = request.TeamId;
            project.ProjectManagerId = request.ProjectManagerId;

            await context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
