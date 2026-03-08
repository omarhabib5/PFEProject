using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.TaskCRUD;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.TaskHandler
{
    public class UpdateTaskCommandHandler : IRequestHandler<UpdateTaskCommand, Unit>
    {
        private readonly IApplicationDbSet _context;

        public UpdateTaskCommandHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(UpdateTaskCommand request, CancellationToken cancellationToken)
        {
            if (request.EndDate <= request.StartDate)
            {
                throw new InvalidOperationException("End date must be after start date.");
            }

            var estimatedDuration = (int)Math.Ceiling((request.EndDate - request.StartDate).TotalDays);

            var task = await _context.Tasks
                .FirstOrDefaultAsync(t => t.id == request.id, cancellationToken);

            if (task == null)
            {
                throw new KeyNotFoundException($"Task with ID {request.id} not found.");
            }

            var originalTaskSprintId = task.SprintId;
            var originalUserStoryId = task.UserStoryId;

            var userStory = await _context.UserStories
                .FirstOrDefaultAsync(us => us.id == request.UserStoryId, cancellationToken);

            if (userStory == null)
            {
                throw new KeyNotFoundException("User story with the specified ID was not found.");
            }

            if (request.StartDate < userStory.StartDate || request.EndDate > userStory.EndDate)
            {
                throw new InvalidOperationException("Task dates must be within the user story's start and end dates.");
            }

            task.Name = request.Name;
            task.description = request.description;
            task.EstimationDuration = estimatedDuration;
            task.StartDate = request.StartDate;
            task.EndDate = request.EndDate;
            task.taskState = request.taskState;
            task.complexity = request.complexity;
            task.UserStoryId = request.UserStoryId;
            task.AssignedToId = request.AssignedToId;

            var affectedUserStoryIds = new HashSet<int> { originalUserStoryId, request.UserStoryId };
            var affectedSprintIds = await _context.UserStories
                .Where(us => affectedUserStoryIds.Contains(us.id))
                .Select(us => us.SprintId)
                .Distinct()
                .ToListAsync(cancellationToken);

            await _context.SaveChangesAsync(cancellationToken);

            var sprintIdsToSync = new HashSet<int>(affectedSprintIds);
            if (originalTaskSprintId.HasValue)
            {
                sprintIdsToSync.Add(originalTaskSprintId.Value);
            }

            if (task.SprintId.HasValue)
            {
                sprintIdsToSync.Add(task.SprintId.Value);
            }

            foreach (var sprintId in sprintIdsToSync)
            {
                await SprintStateSyncHelper.SyncSprintStateFromTasksAsync(_context, sprintId, cancellationToken);
            }

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
