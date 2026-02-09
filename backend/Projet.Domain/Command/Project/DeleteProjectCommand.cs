using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Command.Project
{
    public class DeleteProjectCommand : IRequest<Unit>
    {
        public int id { get; set; }

        public DeleteProjectCommand(int id)
        {
            this.id = id;
        }
    }
}
