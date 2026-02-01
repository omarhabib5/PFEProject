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

            task.title = request.title;
            task.description = request.description;
            task.statue = request.statue;
            task.Priority = request.Priority;
            task.EstimationHours = request.EstimationHours;
            task.ticketID = request.ticketID;
            task.AssingnedToUserID = request.AssingnedToUserID;

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
