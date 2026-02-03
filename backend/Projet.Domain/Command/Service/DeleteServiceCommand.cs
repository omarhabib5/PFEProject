using MediatR;

namespace Projet.Domain.Command.Service
{
    public class DeleteServiceCommand : IRequest<Unit>
    {
        public int id { get; set; }
    }
}
