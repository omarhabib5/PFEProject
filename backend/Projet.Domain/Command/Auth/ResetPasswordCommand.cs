using MediatR;

namespace Projet.Domain.Command.Auth
{
    public class ResetPasswordCommand : IRequest<bool>
    {
        public string Token { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
        public string ConfirmNewPassword { get; set; } = string.Empty;
    }
}
