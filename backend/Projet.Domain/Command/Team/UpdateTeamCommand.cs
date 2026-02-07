using MediatR;

namespace Projet.Domain.Command.Team
{
    public class UpdateTeamCommand : IRequest<Unit>
    {
        public int id { get; set; }
        public string name { get; set; }
        public int ServiceId { get; set; }
    }
}
