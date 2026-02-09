using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Querie.TeamUser
{
    public class GetAllTeamUserQuery : IRequest<IEnumerable<Model.TeamUser>>
    {
    }
}
