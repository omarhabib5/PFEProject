using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Querie.Sprint
{
    public class GetAllSprintQuery : IRequest<List<Model.Sprint>>
    {

    }
}