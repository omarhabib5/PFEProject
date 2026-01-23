using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Command;
using Projet.Domain.Interface;
using Projet.Domain.Model;

namespace Projet.Domain.Handler
{
    public class CreateProjectCommandHandler : IRequestHandler<CreateProjectCommand, Guid>
    {
        private readonly IApplicationDbSet context;

        public CreateProjectCommandHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<Guid> Handle(CreateProjectCommand request, CancellationToken cancellationToken)
        {
            var project = new ProjectModel
            {
                id = Guid.NewGuid(),
                name = request.Name,
                description = request.Description,
                startDate = request.StartDate,
                endDate = request.EndDate,
                status = "Active",
                createdBy = "System"
            };

            context.Projects.Add(project);
            await context.SaveChangesAsync(cancellationToken);

            return project.id;
        }
    }
}
