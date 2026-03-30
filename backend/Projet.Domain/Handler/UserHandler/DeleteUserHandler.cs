using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.User;

namespace Projet.Domain.Handler.UserHandler
{
    public class DeleteUserHandler : IRequestHandler<DeleteUserCommand, bool>
    {
        private readonly Interface.IApplicationDbSet _context;

        public DeleteUserHandler(Interface.IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<bool> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == request.Id, cancellationToken);

            if (user == null)
                return false;

            _context.Users.Remove(user);
            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
