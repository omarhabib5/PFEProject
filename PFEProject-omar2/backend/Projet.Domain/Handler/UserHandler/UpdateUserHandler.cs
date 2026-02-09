using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.User;

namespace Projet.Domain.Handler.UserHandler
{
    public class UpdateUserHandler : IRequestHandler<UpdateUserCommand, Model.User?>
    {
        private readonly Interface.IApplicationDbSet _context;

        public UpdateUserHandler(Interface.IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Model.User?> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == request.Id, cancellationToken);

            if (user == null)
                return null;

            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.Email = request.Email;
            user.role = request.Role;

            await _context.SaveChangesAsync(cancellationToken);

            return user;
        }
    }
}
