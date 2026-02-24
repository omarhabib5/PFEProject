using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Handler.Sprint
{
   public class GetSprintByProjectIdHandler:IRequestHandler<Querie.Sprint.GetSprintByProjectIdQuery, List<Model.Sprint>>
    {
        private readonly Interface.IApplicationDbSet context;
        public GetSprintByProjectIdHandler(Interface.IApplicationDbSet context)
        {
            this.context = context;
        }
        public async Task<List<Model.Sprint>> Handle(Querie.Sprint.GetSprintByProjectIdQuery request, CancellationToken cancellationToken)
        { 
            var sprints = context.Sprints.Where(s => s.ProjectId == request.ProjectId).ToList();
            return sprints;
        }
    }
}
