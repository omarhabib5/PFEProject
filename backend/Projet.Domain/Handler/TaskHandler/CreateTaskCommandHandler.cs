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
                Name = request.Name,
                description = request.description,
                EstimationDuration = request.EstimationDuration,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                taskState = request.taskState,
                complexity = request.complexity,
                UserStoryId = request.UserStoryId
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync(cancellationToken);

            return task.id;
        }
    }
}
