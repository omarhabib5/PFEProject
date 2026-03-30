using MediatR;

namespace Projet.Domain.Command.TeamUser
{
    public class DeleteTeamUserCommand : IRequest<Unit>
    {
        public int Id { get; set; }

        public DeleteTeamUserCommand(int id)
        {
            Id = id;
        }
    }
}
