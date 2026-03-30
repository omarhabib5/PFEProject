using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Querie.Team
{
    public class GetTeamById : IRequest<Model.Team>
    {
        public int id { get; set; }
    }
}
