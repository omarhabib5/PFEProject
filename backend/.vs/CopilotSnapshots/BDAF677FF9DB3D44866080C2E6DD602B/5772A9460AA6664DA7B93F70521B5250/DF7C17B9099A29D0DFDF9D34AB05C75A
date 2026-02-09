using MediatR;
using Projet.Domain.Command.Auth;
using Projet.Domain.comment;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.Auth
{
    public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponse>
    {
        private readonly IAuthenticationService _authService;

        public LoginCommandHandler(IAuthenticationService authService)
        {
            _authService = authService;
        }

        public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            return await _authService.LoginAsync(
                request.Email,
                request.Password,
                cancellationToken);
        }
    }
}
