using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Querie.Auth;

namespace Projet.Domain.Handler.Auth
{
    public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, Model.User?>
    {
        private readonly IApplicationDbSet _context;

        public GetCurrentUserQueryHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async System.Threading.Tasks.Task<Model.User?> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        }
    }
}
