using System;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.TaskCRUD;
using Projet.Domain.Interface;
using Projet.Domain.Utilities;

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
            var normalizedTitle = string.IsNullOrWhiteSpace(request.Title)
                ? throw new ArgumentException("Title is required")
                : request.Title.Trim();

            var effectiveSprintId = request.SprintId
                ?? await _context.UserStories
                    .Where(us => us.Id == request.UserStoryId)
                    .Select(us => us.SprintId)
                    .FirstOrDefaultAsync(cancellationToken);

            var duplicateTaskExists = await _context.Tasks
                .AnyAsync(task => task.SprintId == effectiveSprintId && task.Title == normalizedTitle, cancellationToken);

            if (duplicateTaskExists)
            {
                throw new InvalidOperationException("A task with the same title already exists in this sprint.");
            }

            var task = new Model.Task
            {
                Title = normalizedTitle,
                Description = request.Description,
                EstimatedHours = request.EstimatedHours,
                Status = request.Status,
                Complexity = request.Complexity,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                UserStoryId = request.UserStoryId,
                AssignedToId = request.AssignedToId,
                SprintId = request.SprintId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync(cancellationToken);

            if (task.SprintId.HasValue)
            {
                await SprintStateSynchronizer.SyncSprintAndProjectStateAsync(
                    _context,
                    task.SprintId.Value,
                    cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
            }

            return task.Id;
        }
    }
}
