using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.Auth;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.Auth
{
    public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, bool>
    {
        private readonly IApplicationDbSet _context;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly IPasswordHasher _passwordHasher;

        public ResetPasswordCommandHandler(
            IApplicationDbSet context,
            IJwtTokenService jwtTokenService,
            IPasswordHasher passwordHasher)
        {
            _context = context;
            _jwtTokenService = jwtTokenService;
            _passwordHasher = passwordHasher;
        }

        public async Task<bool> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
        {
            if (request.NewPassword != request.ConfirmNewPassword)
            {
                throw new InvalidOperationException("New password and confirmation do not match");
            }

            if (request.NewPassword.Length < 6)
            {
                throw new InvalidOperationException("New password must be at least 6 characters long");
            }

            var userId = _jwtTokenService.ValidatePasswordResetToken(request.Token);
            if (!userId.HasValue)
            {
                throw new InvalidOperationException("Reset token is invalid or expired");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);
            if (user == null)
            {
                throw new KeyNotFoundException("User not found");
            }

            if (!string.IsNullOrWhiteSpace(user.PasswordHash) &&
                _passwordHasher.VerifyPassword(request.NewPassword, user.PasswordHash))
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
