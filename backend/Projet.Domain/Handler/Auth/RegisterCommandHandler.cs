using MediatR;
using Projet.Domain.Command.Auth;
using Projet.Domain.comment;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.Auth
{
    public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResponse>
    {
        private readonly IAuthenticationService _authService;

        public RegisterCommandHandler(IAuthenticationService authService)
        {
            _authService = authService;
        }

        public async Task<AuthResponse> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            return await _authService.RegisterAsync(
                request.Email,
                request.Password,
                request.FirstName,
                request.LastName,
                request.Role,
                cancellationToken);
        }
    }
}
