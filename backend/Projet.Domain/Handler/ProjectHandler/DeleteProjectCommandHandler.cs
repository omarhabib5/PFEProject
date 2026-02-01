using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Interface;
using Projet.Domain.Command.Project;

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
            var project = context.Projects.FirstOrDefault(p => p.id == request.id);
            if (project == null)
            {
                throw new KeyNotFoundException($"Project with ID {request.id} not found.");
            }
            context.Projects.Remove(project);
            await context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
