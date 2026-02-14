using MediatR;

namespace Projet.Domain.Command.TaskCRUD
{
    public class DeleteTaskCommand : IRequest<Unit>
    {
        public int Id { get; set; }
    }
}
