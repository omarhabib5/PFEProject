using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.Auth;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.Auth
{
    public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, bool>
    {
        private readonly IApplicationDbSet _context;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly IEmailService _emailService;

        public ForgotPasswordCommandHandler(
            IApplicationDbSet context,
            IJwtTokenService jwtTokenService,
            IEmailService emailService)
        {
            _context = context;
            _jwtTokenService = jwtTokenService;
            _emailService = emailService;
        }

        public async Task<bool> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

            if (user == null)
            {
                return true;
            }

            var resetToken = _jwtTokenService.GeneratePasswordResetToken(user, 15);
            var frontendBaseUrl = Environment.GetEnvironmentVariable("FRONTEND_BASE_URL") ?? "http://localhost:4200";
            var resetUrl = $"{frontendBaseUrl.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(resetToken)}";

            var body = $@"
<p>Bonjour {user.FirstName},</p>
<p>Vous avez demande la reinitialisation de votre mot de passe.</p>
<p>Cliquez sur le lien suivant pour definir un nouveau mot de passe (valide 15 minutes):</p>
<p><a href='{resetUrl}'>{resetUrl}</a></p>
<p>Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>";

            await _emailService.SendEmailAsync(user.Email, "Reinitialisation du mot de passe", body, cancellationToken);
            return true;
        }
    }
}
