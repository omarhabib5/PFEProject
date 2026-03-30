using MediatR;

namespace Projet.Domain.Command.Service
{
    public class CreateServiceCommand : IRequest<int>
    {
        public string name { get; set; }
        public int? ResponsibleId { get; set; }
    }
}
