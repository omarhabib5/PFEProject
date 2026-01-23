using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Command
{
    public class DeleteProjectCommand : IRequest<Unit>
    {
        public Guid id { get; set; }

        public DeleteProjectCommand(Guid id)
        {
            this.id = id;
        }
    }
}
