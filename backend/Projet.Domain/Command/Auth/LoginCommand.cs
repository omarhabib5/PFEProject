using MediatR;
using Projet.Domain.comment;

namespace Projet.Domain.Command.Auth
{
    public class LoginCommand : IRequest<AuthResponse>
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
