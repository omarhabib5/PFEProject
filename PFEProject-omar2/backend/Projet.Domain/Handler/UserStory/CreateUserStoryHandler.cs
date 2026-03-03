using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Command.UserStory;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.UserStory
{
    public class CreateUserStoryHandler : IRequestHandler<CreateUserStoryCommand, int>
    {
        private readonly IApplicationDbSet context;

        public CreateUserStoryHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<int> Handle(CreateUserStoryCommand request, CancellationToken cancellationToken)
        {
            if (request.EndDate <= request.StartDate)
            {
                throw new InvalidOperationException("End date must be after start date.");
            }

            var estimatedDuration = (int)Math.Ceiling((request.EndDate - request.StartDate).TotalDays);

            var sprint = context.Sprints.FirstOrDefault(s => s.Id == request.SprintId);
            if (sprint == null)
            {
                throw new KeyNotFoundException("Sprint with the specified ID was not found.");
            }

            if (request.StartDate < sprint.startDate || request.EndDate > sprint.endDate)
            {
                throw new InvalidOperationException("User story dates must be within the sprint's start and end dates.");
            }

            var project = context.Projects.FirstOrDefault(p => p.id == request.ProjectId);
            if (project == null)
            {
                throw new KeyNotFoundException("Project with the specified ID was not found.");
            }

            var userStory = new Model.UserStory
            {
                name = request.Name,
                description = request.Description,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                estimatedDuration = estimatedDuration,
                UserStoryState = request.UserStoryState,
                SprintId = request.SprintId,
                ProjectId = request.ProjectId
            };

            context.UserStories.Add(userStory);
            await context.SaveChangesAsync(cancellationToken);
            return userStory.id;
        }
    }
}
