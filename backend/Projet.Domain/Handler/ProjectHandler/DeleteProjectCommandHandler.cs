using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Command.Project;
using Projet.Domain.Model;

namespace Projet.Domain.Handler.ProjectHandler
{
    internal class DeleteProjectCommandHandler:IRequestHandler<DeleteProjectCommand,Unit>
    {
        private readonly IApplicationDbSet context;

        public DeleteProjectCommandHandler(IApplicationDbSet context)
        {
            this.context = context;
        }
        public async Task<Unit> Handle(DeleteProjectCommand request, CancellationToken cancellationToken)
        {
            var project = await context.Projects
                .FirstOrDefaultAsync(p => p.id == request.id, cancellationToken);

            if (project == null)
            {
                throw new KeyNotFoundException($"Project with ID {request.id} not found.");
            }

            var sprintIds = await context.Sprints
                .Where(s => s.ProjectId == request.id)
                .Select(s => s.Id)
                .ToListAsync(cancellationToken);

            var userStoryIds = await context.UserStories
                .Where(us => us.ProjectId == request.id || sprintIds.Contains(us.SprintId))
                .Select(us => us.Id)
                .ToListAsync(cancellationToken);

            var tasksToDelete = await context.Tasks
                .Where(t => userStoryIds.Contains(t.UserStoryId) || (t.SprintId.HasValue && sprintIds.Contains(t.SprintId.Value)))
                .ToListAsync(cancellationToken);

            if (tasksToDelete.Count > 0)
            {
                context.Tasks.RemoveRange(tasksToDelete);
            }

            var userStoriesToDelete = await context.UserStories
                .Where(us => us.ProjectId == request.id || sprintIds.Contains(us.SprintId))
                .ToListAsync(cancellationToken);

            if (userStoriesToDelete.Count > 0)
            {
                context.UserStories.RemoveRange(userStoriesToDelete);
            }

            var sprintsToDelete = await context.Sprints
                .Where(s => s.ProjectId == request.id)
                .ToListAsync(cancellationToken);

            if (sprintsToDelete.Count > 0)
            {
                context.Sprints.RemoveRange(sprintsToDelete);
            }

            var relatedNotifications = await context.Set<Notification>()
                .Where(n => n.RelatedProjectId == request.id
                    || (n.RelatedUserStoryId.HasValue && userStoryIds.Contains(n.RelatedUserStoryId.Value))
                    || (n.RelatedTaskId.HasValue && tasksToDelete.Select(t => t.Id).Contains(n.RelatedTaskId.Value)))
                .ToListAsync(cancellationToken);

            foreach (var notification in relatedNotifications)
            {
                notification.RelatedProjectId = null;
                if (notification.RelatedUserStoryId.HasValue && userStoryIds.Contains(notification.RelatedUserStoryId.Value))
                {
                    notification.RelatedUserStoryId = null;
                }
                if (notification.RelatedTaskId.HasValue && tasksToDelete.Any(t => t.Id == notification.RelatedTaskId.Value))
                {
                    notification.RelatedTaskId = null;
                }
            }

            context.Projects.Remove(project);
            await context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
