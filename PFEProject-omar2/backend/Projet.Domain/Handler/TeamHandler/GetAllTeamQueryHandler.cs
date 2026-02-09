using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Querie.Team;

namespace Projet.Domain.Handler.TeamHandler
{
    public class GetAllTeamQueryHandler : IRequestHandler<GetAllTeamQuery, List<Model.Team>>
    {
        private readonly IApplicationDbSet _context;

        public GetAllTeamQueryHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<List<Model.Team>> Handle(GetAllTeamQuery request, CancellationToken cancellationToken)
        {
            return await _context.Teams.ToListAsync(cancellationToken);
        }
    }
}
