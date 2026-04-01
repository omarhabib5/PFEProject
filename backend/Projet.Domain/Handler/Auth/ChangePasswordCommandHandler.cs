using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.Auth;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.Auth
{
    public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, bool>
    {
        private readonly IApplicationDbSet _context;
        private readonly IPasswordHasher _passwordHasher;

        public ChangePasswordCommandHandler(IApplicationDbSet context, IPasswordHasher passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        public async Task<bool> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
        {
            if (request.NewPassword != request.ConfirmNewPassword)
            {
                throw new InvalidOperationException("New password and confirmation do not match");
            }

            if (request.NewPassword.Length < 6)
            {
                throw new InvalidOperationException("New password must be at least 6 characters long");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
            if (user == null)
            {
                throw new KeyNotFoundException("User not found");
            }

            if (string.IsNullOrWhiteSpace(user.PasswordHash) ||
                !_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
            {
                throw new InvalidOperationException("Current password is incorrect");
            }

            if (_passwordHasher.VerifyPassword(request.NewPassword, user.PasswordHash))
            {
                throw new InvalidOperationException("New password must be different from current password");
            }

            user.UpdatePassword(_passwordHasher.HashPassword(request.NewPassword));
            user.FailedLoginAttempts = 0;
            user.LockoutEnd = null;
            _context.Users.Update(user);
            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
