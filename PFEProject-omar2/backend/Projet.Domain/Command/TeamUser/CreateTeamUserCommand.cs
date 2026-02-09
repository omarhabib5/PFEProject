using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Command.TeamUser
{
    public class CreateTeamUserCommand : IRequest<int>
    {
        public int UserId { get; set; }
        public int TeamId { get; set; }
        public Role role { get; set; }
    }
}
