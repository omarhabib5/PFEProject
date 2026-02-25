using System.ComponentModel.DataAnnotations;
using Projet.Domain.Model;

namespace Projet.Application.DTOs.Auth
{
    public class CreateEmployeeRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;

        [Required]
        public UserRole Role { get; set; } = UserRole.Employee;

        public int? ServiceId { get; set; }
    }
}
