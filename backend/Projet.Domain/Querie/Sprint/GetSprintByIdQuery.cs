using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Querie.Sprint
{
    public class GetSprintByIdQuery : IRequest<Model.Sprint>
    {
        public int Id { get; set; }
    }
}