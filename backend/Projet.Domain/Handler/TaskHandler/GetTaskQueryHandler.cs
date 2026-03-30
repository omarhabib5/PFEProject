using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Querie.Task;

namespace Projet.Domain.Handler.TaskHandler
{
    public class GetAllTasksQueryHandler : IRequestHandler<GetAllTasksQuery, List<Model.Task>>
    {
        private readonly IApplicationDbSet _context;

        public GetAllTasksQueryHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<List<Model.Task>> Handle(GetAllTasksQuery request, CancellationToken cancellationToken)
        {
            return await _context.Tasks.ToListAsync(cancellationToken);
        }
    }

    public class GetTaskByIdQueryHandler : IRequestHandler<GetTaskById, Model.Task>
    {
        private readonly IApplicationDbSet _context;

        public GetTaskByIdQueryHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Model.Task> Handle(GetTaskById request, CancellationToken cancellationToken)
        {
            var task = await _context.Tasks
                .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

            if (task == null)
            {
                throw new KeyNotFoundException($"Task with ID {request.Id} not found.");
            }

            return task;
        }
    }
}
