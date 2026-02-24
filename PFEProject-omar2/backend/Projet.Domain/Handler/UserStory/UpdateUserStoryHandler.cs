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
    public class UpdateUserStoryHandler : IRequestHandler<UpdateUserStoryCommand, Unit>
    {
        private readonly IApplicationDbSet context;

        public UpdateUserStoryHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<Unit> Handle(UpdateUserStoryCommand request, CancellationToken cancellationToken)
        {
            var userStory = context.UserStories.FirstOrDefault(us => us.id == request.Id);
            if (userStory == null)
            {
                throw new KeyNotFoundException($"UserStory with ID {request.Id} not found.");
            }

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

            var project = context.Projects.FirstOrDefault(p => p.id == request.ProjectId);
            if (project == null)
            {
                throw new KeyNotFoundException("Project with the specified ID was not found.");
            }

            userStory.name = request.Name;
            userStory.description = request.Description;
            userStory.StartDate = request.StartDate;
            userStory.EndDate = request.EndDate;
            userStory.estimatedDuration = estimatedDuration;
            userStory.UserStoryState = request.UserStoryState;
            userStory.SprintId = request.SprintId;
            userStory.ProjectId = request.ProjectId;

            await context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
