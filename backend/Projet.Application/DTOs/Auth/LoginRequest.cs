using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Projet.Domain.Enums;
namespace Projet.Application.DTOs.Auth
{
    public class LoginRequest
    {
        public string Email { get; set; }= string.Empty;
        public string Password { get; set; }= string.Empty;
        public bool RememberMe { get; set; }
    }
    public class RegisterRequest
    {
        public string FirstName { get; set; }= string.Empty;
        public string LastName { get; set; }= string.Empty;
        public string Email { get; set; }= string.Empty;
        public string UserName { get; set; }= string.Empty;
        public string Password { get; set; }= string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
        public UserRole Role { get; set; }
    }
    public class RefreshTokenRequest
    {
        public string Token { get; set; }= string.Empty;
        public string RefreshToken { get; set; }= string.Empty;
    }
    public class changePasswordRequest
    {
        public string CurrentPassword { get; set; }= string.Empty;
        public string NewPassword { get; set; }= string.Empty;
        public string ConfirmNewPassword { get; set; }= string.Empty;
    }
}
