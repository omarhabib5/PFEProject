using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Application.DTOs.Auth
{
    public  class AuthResponse
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; }= string.Empty;
        public string LastName { get; set; }= string.Empty;
        public string Email { get; set; }= string.Empty;
        public string UserName { get; set; }= string.Empty;
        public string Role { get; set; }= string.Empty;
        public string RoleDisplayName { get; set; }= string.Empty;
        public string profileImageUrl { get; set; }= string.Empty;
        public string Token { get; set; }= string.Empty;
        public string RefreshToken { get; set; }= string.Empty;
        public DateTime tokenExpiry { get; set; }
        public bool IsEmailConfirmed { get; set; }
    }
    public class UserInfoResponse
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; }= string.Empty;
        public string LastName { get; set; }= string.Empty;
        public string Email { get; set; }= string.Empty;
        public string UserName { get; set; }= string.Empty;
        public string Role { get; set; }= string.Empty;
        public string RoleDisplayName { get; set; }= string.Empty;
        public string? profileImageUrl { get; set; }= string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public bool IsEmailConfirmed { get; set; }
    }
}
