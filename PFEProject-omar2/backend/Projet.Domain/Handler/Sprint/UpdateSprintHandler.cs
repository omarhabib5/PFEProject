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
    public class UpdateSprintHandler : IRequestHandler<UpdateSprintCommand, Unit>
    {
        private readonly IApplicationDbSet context;  
        
        public UpdateSprintHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<Unit> Handle(UpdateSprintCommand request,CancellationToken cancellationToken)
        {
            if (request.EndDate <= request.StartDate)
            {
                throw new InvalidOperationException("End date must be after start date.");
            }

            var estimatedDuration = (int)Math.Ceiling((request.EndDate - request.StartDate).TotalDays);

            var sprint = context.Sprints.Find(request.id);
            if (sprint == null)
            {
                throw new Exception("Sprint not found");
            }
            sprint.Name = request.Name;
            sprint.Description = request.Description;
            sprint.estimatedDuration = estimatedDuration;
            sprint.startDate = request.StartDate;
            sprint.endDate = request.EndDate;
            sprint.ProjectId = request.ProjectId;
            sprint.SprintState = request.SprintState;
            context.Sprints.Update(sprint);
            await context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }

    }
}
