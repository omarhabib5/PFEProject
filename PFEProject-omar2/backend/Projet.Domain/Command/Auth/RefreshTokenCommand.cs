using MediatR;
using Projet.Domain.comment;

namespace Projet.Domain.Command.Auth
{
    public class RefreshTokenCommand : IRequest<AuthResponse>
    {
        public string RefreshToken { get; set; } = string.Empty;
    }
}
