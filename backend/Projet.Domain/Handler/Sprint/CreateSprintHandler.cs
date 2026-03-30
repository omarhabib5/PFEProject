using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Command.Sprint;
using Projet.Domain.Interface;

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

            var project = context.Projects.FirstOrDefault(p => p.id == request.ProjectId);
            if (project == null)
            {
                throw new KeyNotFoundException("project with the specified ID was not found.");
            }

            var sprint = new Model.Sprint
            {
                Name = request.Name,
                Description = request.Description,
                estimatedDuration = request.EstimatedDuration,
                startDate = request.StartDate,
                endDate = request.EndDate,
                ProjectId = request.ProjectId,
                SprintState = request.SprintState
            };
            context.Sprints.Add(sprint);
            await context.SaveChangesAsync(cancellationToken);
            return sprint.Id;
        }
    }

}