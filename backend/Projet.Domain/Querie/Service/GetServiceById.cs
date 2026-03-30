using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Querie.Service
{
    public class GetServiceById : IRequest<Model.Service>
    {
        public int id { get; set; }
    }
}
