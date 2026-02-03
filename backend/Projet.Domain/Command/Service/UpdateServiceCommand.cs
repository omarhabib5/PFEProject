using MediatR;

namespace Projet.Domain.Command.Service
{
    public class UpdateServiceCommand : IRequest<Unit>
    {
        public int id { get; set; }
        public string name { get; set; }
    }
}
