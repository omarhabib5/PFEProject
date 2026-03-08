using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.TaskCRUD;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.TaskHandler
{
    public class CreateTaskCommandHandler : IRequestHandler<CreateTaskCommand, int>
    {
        private readonly IApplicationDbSet _context;

        public CreateTaskCommandHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<int> Handle(CreateTaskCommand request, CancellationToken cancellationToken)
        {
            if (request.EndDate <= request.StartDate)
            {
                throw new InvalidOperationException("End date must be after start date.");
            }

            var estimatedDuration = (int)Math.Ceiling((request.EndDate - request.StartDate).TotalDays);

            var userStory = _context.UserStories.FirstOrDefault(us => us.id == request.UserStoryId);
            if (userStory == null)
            {
                throw new KeyNotFoundException("User story with the specified ID was not found.");
            }

            if (request.StartDate < userStory.StartDate || request.EndDate > userStory.EndDate)
            {
                throw new InvalidOperationException("Task dates must be within the user story's start and end dates.");
            }

            var task = new Model.Task
            {
                Name = request.Name,
                description = request.description,
                EstimationDuration = estimatedDuration,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                taskState = request.taskState,
                complexity = request.complexity,
                UserStoryId = request.UserStoryId,
                AssignedToId = request.AssignedToId
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync(cancellationToken);

            var sprintIdsToSync = await _context.UserStories
                .Where(us => us.id == request.UserStoryId)
                .Select(us => us.SprintId)
                .ToListAsync(cancellationToken);

            if (task.SprintId.HasValue)
            {
                sprintIdsToSync.Add(task.SprintId.Value);
            }

            foreach (var sprintId in sprintIdsToSync.Distinct())
            {
                await SprintStateSyncHelper.SyncSprintStateFromTasksAsync(_context, sprintId, cancellationToken);
            }

            await _context.SaveChangesAsync(cancellationToken);

            return task.id;
        }
    }
}
