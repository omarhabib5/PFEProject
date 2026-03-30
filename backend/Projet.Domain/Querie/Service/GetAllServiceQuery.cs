using MediatR;
using System.Collections.Generic;

namespace Projet.Domain.Querie.Service
{
    public class GetAllServiceQuery : IRequest<List<Model.Service>>
    {
    }
}
