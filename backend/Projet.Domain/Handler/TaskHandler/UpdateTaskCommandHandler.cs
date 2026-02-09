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
            var task = await _context.Tasks
                .FirstOrDefaultAsync(t => t.id == request.id, cancellationToken);

            if (task == null)
            {
                throw new KeyNotFoundException($"Task with ID {request.id} not found.");
            }

            task.Name = request.Name;
            task.description = request.description;
            task.EstimationDuration = request.EstimationDuration;
            task.StartDate = request.StartDate;
            task.EndDate = request.EndDate;
            task.taskState = request.taskState;
            task.complexity = request.complexity;
            task.UserStoryId = request.UserStoryId;

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
