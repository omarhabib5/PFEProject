using MediatR;
using Projet.Domain.comment;
using Projet.Domain.Model;

namespace Projet.Domain.Command.Auth
{
    public class CreateEmployeeCommand : IRequest<AuthResponse>
    {
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public UserRole Role { get; set; } = UserRole.Employee;
        public int? ServiceId { get; set; }
    }
}
