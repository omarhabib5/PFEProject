using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Model;
using Projet.Domain.Querie.TeamUser;

namespace Projet.Domain.Handler.TeamUser
{
    public class GetProjectLeaderHandler : IRequestHandler<GetProjectLeaderQuery, IEnumerable<Model.TeamUser>>
    {
        private readonly IApplicationDbSet _context;

        public GetProjectLeaderHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Model.TeamUser>> Handle(GetProjectLeaderQuery request, CancellationToken cancellationToken)
        {
            return await _context.Set<Model.TeamUser>()
                .Include(tu => tu.User)
                .Include(tu => tu.team)
                .Where(tu => tu.TeamId == request.TeamId 
                    && tu.role == Role.PrjectLeader 
                    && tu.LeftAt == null)
                .ToListAsync(cancellationToken);
        }
    }
}
