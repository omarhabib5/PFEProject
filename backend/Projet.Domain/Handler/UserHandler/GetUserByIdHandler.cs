using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Querie.User;

namespace Projet.Domain.Handler.UserHandler
{
    public class GetUserByIdHandler : IRequestHandler<GetUserByIdQuery, Model.User?>
    {
        private readonly Interface.IApplicationDbSet _context;

        public GetUserByIdHandler(Interface.IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Model.User?> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Id == request.Id, cancellationToken);
        }
    }
}
