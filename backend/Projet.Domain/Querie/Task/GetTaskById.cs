using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Querie.Task
{
    public class GetTaskById : IRequest<Model.Task>
    {
        public int id { get; set; }
    }
}
