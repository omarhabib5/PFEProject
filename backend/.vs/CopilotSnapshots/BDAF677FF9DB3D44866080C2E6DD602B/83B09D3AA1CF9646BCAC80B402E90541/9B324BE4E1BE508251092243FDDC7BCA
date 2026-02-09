using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Command.User
{
    public class UpdateUserCommand : IRequest<Model.User?>
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public UserRole Role { get; set; }
    }
}
