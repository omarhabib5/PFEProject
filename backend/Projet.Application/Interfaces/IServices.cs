using Projet.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Application.Interfaces
{
    public interface IServices
    {
        JwtToken GenerateToken(User user);
        string GenerateRefreshToken();
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
        string GetUserIdFromToken(string token);

    }
    public class JwtToken
    {
        public string Token { get; set; } = string.Empty;
        public string JwtId { get; set; } = string.Empty;
        public DateTime ExpiryDate { get; set; }
    }
    public class PasswordHash
    {
        public string Hash { get; set; } = string.Empty;
        public string Salt { get; set; } = string.Empty;
    }
    public interface IPasswordHasher
    {
        PasswordHash HashPassword(string password);
        bool VerifyPassword(string password, string storedHash, string storedSalt);
    }
    public interface ICurrentUserService
    {
        Guid UserId { get; }
        string UserName { get; }
        string Email { get; }
        string Role { get; }
        bool IsAuthenticated { get; }
    }
}
