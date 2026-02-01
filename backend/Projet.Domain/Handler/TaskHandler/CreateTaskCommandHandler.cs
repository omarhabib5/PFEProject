using MediatR;
using Projet.Domain.Command.TaskCRUD;
using Projet.Domain.Interface;

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
            var task = new Model.Task
            {
                title = request.title,
                description = request.description,
                statue = request.statue,
                Priority = request.Priority,
                EstimationHours = request.EstimationHours,
                ticketID = request.ticketID,
                AssingnedToUserID = request.AssingnedToUserID
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync(cancellationToken);

            return task.id;
        }
    }
}
