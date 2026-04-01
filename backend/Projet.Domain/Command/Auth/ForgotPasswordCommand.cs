using MediatR;

namespace Projet.Domain.Command.Auth
{
    public class ForgotPasswordCommand : IRequest<bool>
    {
        public string Email { get; set; } = string.Empty;
    }
}
