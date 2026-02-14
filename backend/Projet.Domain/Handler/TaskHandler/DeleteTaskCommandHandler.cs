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
                .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

            if (task == null)
            {
                throw new KeyNotFoundException($"Task with ID {request.Id} not found.");
            }

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
