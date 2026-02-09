using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Querie.User;

namespace Projet.Domain.Handler.UserHandler
{
    public class GetAllUsersHandler : IRequestHandler<GetAllUsersQuery, List<Model.User>>
    {
        private readonly Interface.IApplicationDbSet _context;

        public GetAllUsersHandler(Interface.IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<List<Model.User>> Handle(GetAllUsersQuery request, CancellationToken cancellationToken)
        {
            return await _context.Users.ToListAsync(cancellationToken);
        }
    }
}
