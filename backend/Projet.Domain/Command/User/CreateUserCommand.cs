using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Command.User
{
    public class CreateUserCommand : IRequest<Model.User>
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public UserRole Role { get; set; }
    }
}
