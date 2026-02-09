using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Command.TeamUser
{
    public class UpdateTeamUserCommand : IRequest<Unit>
    {
        public int Id { get; set; }
        public Role role { get; set; }
        public DateTime? LeftAt { get; set; }
    }
}
