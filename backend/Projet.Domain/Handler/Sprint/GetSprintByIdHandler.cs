using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Handler.Sprint
{
    public class GetSprintByIdHandler : IRequestHandler<Querie.Sprint.GetSprintByIdQuery, Model.Sprint>
    {
        private readonly Interface.IApplicationDbSet context;
        public GetSprintByIdHandler(Interface.IApplicationDbSet context)
        {
            this.context = context;
        }
        public async Task<Model.Sprint> Handle(Querie.Sprint.GetSprintByIdQuery request, CancellationToken cancellationToken)
        {
            var sprint = context.Sprints.FirstOrDefault(s => s.Id == request.Id);
            if (sprint == null)
            {
                throw new KeyNotFoundException("Sprint with the specified ID was not found.");
            }
            return sprint;
        }
    }
}