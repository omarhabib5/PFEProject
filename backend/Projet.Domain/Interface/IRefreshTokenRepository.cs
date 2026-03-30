using Projet.Domain.Model;

namespace Projet.Domain.Interface
{
    public interface IRefreshTokenRepository
    {
        System.Threading.Tasks.Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken cancellationToken = default);
        System.Threading.Tasks.Task<RefreshToken> CreateAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);
        System.Threading.Tasks.Task RevokeAsync(string token, string? reason = null, CancellationToken cancellationToken = default);
        System.Threading.Tasks.Task RevokeAllByUserIdAsync(int userId, string? reason = null, CancellationToken cancellationToken = default);
        System.Threading.Tasks.Task<List<RefreshToken>> GetActiveTokensByUserIdAsync(int userId, CancellationToken cancellationToken = default);
    }
}
