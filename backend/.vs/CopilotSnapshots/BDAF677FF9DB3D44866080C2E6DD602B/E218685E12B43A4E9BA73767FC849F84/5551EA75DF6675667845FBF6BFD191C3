using System.ComponentModel.DataAnnotations;

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

        public int? ServiceId { get; set; }
    }
}
