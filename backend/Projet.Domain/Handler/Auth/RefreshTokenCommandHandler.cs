using MediatR;
using Projet.Domain.Command.Auth;
using Projet.Domain.comment;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.Auth
{
    public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponse>
    {
        private readonly IAuthenticationService _authService;

        public RefreshTokenCommandHandler(IAuthenticationService authService)
        {
            _authService = authService;
        }

        public async Task<AuthResponse> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
        {
            return await _authService.RefreshTokenAsync(
                request.RefreshToken,
                cancellationToken);
        }
    }
}
