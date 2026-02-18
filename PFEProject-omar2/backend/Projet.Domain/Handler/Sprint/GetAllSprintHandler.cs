using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Handler.Sprint
{
    public class GetAllSprintHandler: IRequestHandler<Querie.Sprint.GetAllSprintQuery, List<Model.Sprint>>
    {
        private readonly Interface.IApplicationDbSet context;
        public GetAllSprintHandler(Interface.IApplicationDbSet context)
        {
            this.context = context;
        }
        public async Task<List<Model.Sprint>> Handle(Querie.Sprint.GetAllSprintQuery request, CancellationToken cancellationToken)
        {
            var sprints = context.Sprints.ToList();
            return sprints;
        }

    }
}
