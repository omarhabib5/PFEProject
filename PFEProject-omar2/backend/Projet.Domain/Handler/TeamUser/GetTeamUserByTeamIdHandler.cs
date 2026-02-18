using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Querie.TeamUser;

namespace Projet.Domain.Handler.TeamUser
{
    public class GetTeamUserByTeamIdHandler : IRequestHandler<GetTeamUserByTeamIdQuery, IEnumerable<Model.TeamUser>>
    {
        private readonly IApplicationDbSet _context;

        public GetTeamUserByTeamIdHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Model.TeamUser>> Handle(GetTeamUserByTeamIdQuery request, CancellationToken cancellationToken)
        {
            return await _context.Set<Model.TeamUser>()
                .Include(tu => tu.User)
                .Where(tu => tu.TeamId == request.TeamId && tu.LeftAt == null)
                .AsNoTracking()
                .ToListAsync(cancellationToken);
        }
    }
}
