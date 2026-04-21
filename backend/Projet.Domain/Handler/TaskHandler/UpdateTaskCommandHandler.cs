using System;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.TaskCRUD;
using Projet.Domain.Interface;
using Projet.Domain.Utilities;

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
            var task = await _context.Tasks
                .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

            if (task == null)
            {
                throw new KeyNotFoundException($"Task with ID {request.Id} not found.");
            }

            var previousSprintId = task.SprintId;

            task.Title = request.Title;
            task.Description = request.Description;
            task.EstimatedHours = request.EstimatedHours;
            task.StartDate = request.StartDate;
            task.EndDate = request.EndDate;
            task.Status = request.Status;
            task.Complexity = request.Complexity;
            task.UserStoryId = request.UserStoryId;
            task.AssignedToId = request.AssignedToId;
            task.SprintId = request.SprintId;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            var sprintIdsToSync = new[] { previousSprintId, task.SprintId }
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .Distinct()
                .ToList();

            foreach (var sprintId in sprintIdsToSync)
            {
                await SprintStateSynchronizer.SyncSprintAndProjectStateAsync(
                    _context,
                    sprintId,
                    cancellationToken);
            }

            if (sprintIdsToSync.Count > 0)
            {
                await _context.SaveChangesAsync(cancellationToken);
            }

            return Unit.Value;
        }
    }
}
