using MediatR;
using Projet.Domain.comment;

namespace Projet.Domain.Command.Auth
{
    public class CreateEmployeeCommand : IRequest<AuthResponse>
    {
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public int? ServiceId { get; set; }
    }
}
