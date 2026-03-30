using System;
using MediatR;
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
            var task = new Model.Task
            {
                Title = request.Title,
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

           

            return task.Id;
        }
    }
}
