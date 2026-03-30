using Projet.Domain.comment;

namespace Projet.Domain.Interface
{
    public interface IAuthenticationService
    {
        System.Threading.Tasks.Task<AuthResponse> RegisterAsync(string email, string password, string firstName, string lastName, string role, CancellationToken cancellationToken = default);
        System.Threading.Tasks.Task<AuthResponse> LoginAsync(string email, string password, CancellationToken cancellationToken = default);
        System.Threading.Tasks.Task<AuthResponse> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);
        System.Threading.Tasks.Task<bool> LogoutAsync(int userId, CancellationToken cancellationToken = default);
    }
}
