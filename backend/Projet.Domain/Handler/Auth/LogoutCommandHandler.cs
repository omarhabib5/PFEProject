using MediatR;
using Projet.Domain.Command.Auth;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.Auth
{
    public class LogoutCommandHandler : IRequestHandler<LogoutCommand, bool>
    {
        private readonly IAuthenticationService _authService;

        public LogoutCommandHandler(IAuthenticationService authService)
        {
            _authService = authService;
        }

        public async Task<bool> Handle(LogoutCommand request, CancellationToken cancellationToken)
        {
            return await _authService.LogoutAsync(request.UserId, cancellationToken);
        }
    }
}
