using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Command.Sprint;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.Sprint
{
    public class DeleteSprintHandler : IRequestHandler<DeleteSprintCommand, Unit>
    {
        private readonly IApplicationDbSet context;
        public DeleteSprintHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<Unit> Handle(DeleteSprintCommand request, CancellationToken cancellationToken)
        {
            var sprint = await context.Sprints.FindAsync(new object[] { request.Id }, cancellationToken);
            if (sprint == null)
            {
                throw new KeyNotFoundException($"Sprint with ID {request.Id} not found.");
            }
            context.Sprints.Remove(sprint);
            await context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}