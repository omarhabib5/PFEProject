using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Model;

namespace Projet.Domain.Handler.TaskHandler
{
    internal static class SprintStateSyncHelper
    {
        public static async Task SyncSprintStateFromTasksAsync(
            IApplicationDbSet context,
            int sprintId,
            CancellationToken cancellationToken)
        {
            var sprint = await context.Sprints
                .FirstOrDefaultAsync(s => s.Id == sprintId, cancellationToken);

            if (sprint == null)
            {
                return;
            }

            var taskStates = await context.Tasks
                .Where(t => t.SprintId == sprintId || t.UserStory.SprintId == sprintId)
                .Select(t => t.taskState)
                .ToListAsync(cancellationToken);

            if (taskStates.Count == 0)
            {
                sprint.SprintState = State.pending;
            }
            else if (taskStates.All(state => state == State.done))
            {
                if (sprint.SprintState != State.validated)
                {
                    sprint.SprintState = State.done;
                }
            }
            else if (taskStates.Any(state => state == State.todo))
            {
                sprint.SprintState = State.todo;
            }
            else if (taskStates.Any(state => state == State.inProgress))
            {
                sprint.SprintState = State.inProgress;
            }
            else
            {
                sprint.SprintState = State.pending;
            }
        }
    }
}