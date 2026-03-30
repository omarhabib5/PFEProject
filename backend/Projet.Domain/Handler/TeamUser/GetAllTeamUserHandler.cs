using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Querie.TeamUser;

namespace Projet.Domain.Handler.TeamUser
{
    public class GetAllTeamUserHandler : IRequestHandler<GetAllTeamUserQuery, IEnumerable<Model.TeamUser>>
    {
        private readonly IApplicationDbSet _context;

        public GetAllTeamUserHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Model.TeamUser>> Handle(GetAllTeamUserQuery request, CancellationToken cancellationToken)
        {
            return await _context.Set<Model.TeamUser>()
                .Include(tu => tu.User)
                .AsNoTracking()
                .ToListAsync(cancellationToken);
        }
    }
}
