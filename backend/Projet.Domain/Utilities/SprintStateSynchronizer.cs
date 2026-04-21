using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Model;

namespace Projet.Domain.Utilities
{
	public static class SprintStateSynchronizer
	{
		public static async System.Threading.Tasks.Task SyncSprintAndProjectStateAsync(
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
				.Where(t => t.SprintId == sprintId)
				.Select(t => t.Status)
				.ToListAsync(cancellationToken);

			sprint.SprintState = ResolveAggregatedState(taskStates);

			await SyncProjectStateAsync(context, sprint.ProjectId, cancellationToken);
		}

		public static async System.Threading.Tasks.Task SyncProjectStateAsync(
			IApplicationDbSet context,
			int projectId,
			CancellationToken cancellationToken)
		{
			var project = await context.Projects
				.FirstOrDefaultAsync(p => p.id == projectId, cancellationToken);

			if (project == null)
			{
				return;
			}

			var sprintStates = await context.Sprints
				.Where(s => s.ProjectId == projectId)
				.Select(s => s.SprintState)
				.ToListAsync(cancellationToken);

			project.projectState = ResolveAggregatedState(sprintStates);
		}

		private static State ResolveAggregatedState(IReadOnlyCollection<State> states)
		{
			if (states.Count == 0)
			{
				return State.pending;
			}

			if (states.All(s => s == State.validated))
			{
				return State.validated;
			}

			// A parent is done only when every child is strictly done.
			if (states.All(s => s == State.done))
			{
				return State.done;
			}

			// Any mixed progress (in progress, done, or validated with other states)
			// keeps the parent in progress.
			if (states.Any(s => s == State.inProgress || s == State.done || s == State.validated))
			{
				return State.inProgress;
			}

			if (states.Any(s => s == State.todo))
			{
				return State.todo;
			}

			return State.pending;
		}
	}
}
