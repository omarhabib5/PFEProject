using MediatR;

namespace Projet.Domain.Command.Auth
{
    public class LogoutCommand : IRequest<bool>
    {
        public int UserId { get; set; }
    }
}
