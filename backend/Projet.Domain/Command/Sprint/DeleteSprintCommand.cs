using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Command.Sprint
{
    public class DeleteSprintCommand : IRequest<Unit>
    {
        public int Id { get; set; }

        public DeleteSprintCommand(int id)
        {
            Id = id;
        }
    }
}