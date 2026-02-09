using MediatR;
using System.Collections.Generic;

namespace Projet.Domain.Querie.Team
{
    public class GetAllTeamQuery : IRequest<List<Model.Team>>
    {
    }
}
