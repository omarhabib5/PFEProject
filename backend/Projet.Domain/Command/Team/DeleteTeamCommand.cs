using MediatR;

namespace Projet.Domain.Command.Team
{
    public class DeleteTeamCommand : IRequest<Unit>
    {
        public int id { get; set; }
    }
}
