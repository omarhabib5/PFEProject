using System.Security.Claims;
using Projet.Domain.Model;

namespace Projet.Domain.Interface
{
    public interface IJwtTokenService
    {
        string GenerateAccessToken(User user);
        string GenerateRefreshToken();
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
        int? ValidateToken(string token);
    }
}
