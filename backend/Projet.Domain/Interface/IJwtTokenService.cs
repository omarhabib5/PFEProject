using System.Security.Claims;
using Projet.Domain.Model;

namespace Projet.Domain.Interface
{
    public interface IJwtTokenService
    {
        string GenerateAccessToken(User user);
        string GenerateRefreshToken();
        string GeneratePasswordResetToken(User user, int expiresInMinutes = 15);
        int? ValidatePasswordResetToken(string token);
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
        int? ValidateToken(string token);
    }
}
