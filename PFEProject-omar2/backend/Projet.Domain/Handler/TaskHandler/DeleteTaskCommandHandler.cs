using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.TaskCRUD;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.TaskHandler
{
    public class DeleteTaskCommandHandler : IRequestHandler<DeleteTaskCommand, Unit>
    {
        private readonly IApplicationDbSet _context;

        public DeleteTaskCommandHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(DeleteTaskCommand request, CancellationToken cancellationToken)
        {
            var task = await _context.Tasks
                .FirstOrDefaultAsync(t => t.id == request.id, cancellationToken);

            if (task == null)
            {
                throw new KeyNotFoundException($"Task with ID {request.id} not found.");
            }

            var sprintIdsToSync = new HashSet<int>();

            if (task.SprintId.HasValue)
            {
                sprintIdsToSync.Add(task.SprintId.Value);
            }

            var userStorySprintId = await _context.UserStories
                .Where(us => us.id == task.UserStoryId)
                .Select(us => us.SprintId)
                .FirstOrDefaultAsync(cancellationToken);

            if (userStorySprintId > 0)
            {
                sprintIdsToSync.Add(userStorySprintId);
            }

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync(cancellationToken);

            foreach (var sprintId in sprintIdsToSync)
            {
                await SprintStateSyncHelper.SyncSprintStateFromTasksAsync(_context, sprintId, cancellationToken);
            }

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
