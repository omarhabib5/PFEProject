using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.Sprint;
using Projet.Domain.Interface;
using Projet.Domain.Utilities;

namespace Projet.Domain.Handler.Sprint
{
    public class CreateSprintHandler : IRequestHandler<CreateSprintCommand, int>

    {
        private readonly IApplicationDbSet context;

        public CreateSprintHandler(IApplicationDbSet context)
        {
            this.context = context;
        }
        public async Task<int> Handle(CreateSprintCommand request, CancellationToken cancellationToken)
        {
            var normalizedName = request.Name?.Trim();
            if (string.IsNullOrWhiteSpace(normalizedName))
            {
                throw new ArgumentException("Sprint name is required.");
            }

            var project = context.Projects.FirstOrDefault(p => p.id == request.ProjectId);
            if (project == null)
            {
                throw new KeyNotFoundException("project with the specified ID was not found.");
            }

            var sprintAlreadyExists = await context.Sprints
                .AnyAsync(s => s.ProjectId == request.ProjectId
                    && s.Name != null
                    && s.Name.Trim().ToLower() == normalizedName.ToLower(), cancellationToken);

            if (sprintAlreadyExists)
            {
                throw new InvalidOperationException("A sprint with this name already existed.");
            }

            var sprint = new Model.Sprint
            {
                Name = normalizedName,
                Description = request.Description,
                estimatedDuration = request.EstimatedDuration,
                startDate = request.StartDate,
                endDate = request.EndDate,
                ProjectId = request.ProjectId,
                SprintState = request.SprintState
            };
            context.Sprints.Add(sprint);
            await context.SaveChangesAsync(cancellationToken);

            await SprintStateSynchronizer.SyncProjectStateAsync(
                context,
                sprint.ProjectId,
                cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            return sprint.Id;
        }
    }

}