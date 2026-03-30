using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Querie.TeamUser
{
    public class GetTeamUserByTeamIdQuery : IRequest<IEnumerable<Model.TeamUser>>
    {
        public int TeamId { get; set; }
    }
}
