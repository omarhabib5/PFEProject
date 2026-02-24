using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
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
            if (request.EndDate <= request.StartDate)
            {
                throw new InvalidOperationException("End date must be after start date.");
            }

            var estimatedDuration = (int)Math.Ceiling((request.EndDate - request.StartDate).TotalDays);

          
            if (request.ServiceId.HasValue && request.ServiceId.Value > 0)
            {
                var serviceExists = await context.Services.AnyAsync(s => s.id == request.ServiceId.Value, cancellationToken);
                if (!serviceExists)
                {
                    throw new KeyNotFoundException($"Service with ID {request.ServiceId} not found.");
                }
            }

          
            if (request.TeamId.HasValue && request.TeamId.Value > 0)
            {
                var teamExists = await context.Teams.AnyAsync(t => t.id == request.TeamId.Value, cancellationToken);
                if (!teamExists)
                {
                    throw new KeyNotFoundException($"Team with ID {request.TeamId} not found.");
                }
            }

            var projectManagerExists = await context.Users.AnyAsync(u => u.Id == request.ProjectManagerId, cancellationToken);
            if (!projectManagerExists)
            {
                throw new KeyNotFoundException($"User (Project Manager) with ID {request.ProjectManagerId} not found.");
            }

            var project = new Project
            {
                name = request.Name,
                description = request.Description,
                startDate = request.StartDate,
                endDate = request.EndDate,
                estimatedDuration = estimatedDuration,
                projectState = request.ProjectState,
                ServiceId = request.ServiceId,
                TeamId = request.TeamId,
                ProjectManagerId = request.ProjectManagerId
            };

            context.Projects.Add(project);
            await context.SaveChangesAsync(cancellationToken);

            return project.id;
        }
    }
}
