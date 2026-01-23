using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Command;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler
{
    public class UpdateProjectCommandHandler : IRequestHandler<UpdateProjectCommand, Unit>
    {
        private readonly IApplicationDbSet context;

        public UpdateProjectCommandHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<Unit> Handle(UpdateProjectCommand request, CancellationToken cancellationToken)
        {
            var project = context.Projects.FirstOrDefault(p => p.id == request.id);
            
            if (project == null)
            {
                throw new KeyNotFoundException($"Project with ID {request.id} not found.");
            }

            project.name = request.Name;
            project.description = request.Description;
            project.startDate = request.StartDate;
            project.endDate = request.EndDate;
            project.status = request.Status;

            await context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
