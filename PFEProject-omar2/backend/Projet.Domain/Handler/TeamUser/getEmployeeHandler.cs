using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Model;
using Projet.Domain.Querie.TeamUser;

namespace Projet.Domain.Handler.TeamUser
{
    public class GetEmployeeHandler : IRequestHandler<GetEmployeeQuery, IEnumerable<Model.TeamUser>>
    {
        private readonly IApplicationDbSet _context;

        public GetEmployeeHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Model.TeamUser>> Handle(GetEmployeeQuery request, CancellationToken cancellationToken)
        {
            return await _context.Set<Model.TeamUser>()
                .Include(tu => tu.User)
                .Where(tu => tu.TeamId == request.TeamId 
                    && tu.role == Role.Employer 
                    && tu.LeftAt == null)
                .AsNoTracking()
                .ToListAsync(cancellationToken);
        }
    }
}
