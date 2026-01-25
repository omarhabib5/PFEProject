using System.Security.Claims;
using Projet.Domain.Entities;

namespace Projet.Application.Interfaces
{
    public interface IJwtService
    {
        JwtToken GenerateToken(User user);
        string GenerateRefreshToken();
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
        string? GetUserIdFromToken(string token);
    }
}