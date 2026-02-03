using MediatR;

namespace Projet.Domain.Command.Team
{
    public class CreateTeamCommand : IRequest<int>
    {
        public string name { get; set; }
    }
}
