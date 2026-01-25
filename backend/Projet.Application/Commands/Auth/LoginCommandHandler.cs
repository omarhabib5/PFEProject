using MediatR;
using Microsoft.Extensions.Logging;
using Projet.Application.DTOs.Auth;
using Projet.Application.Interfaces;
using Projet.Domain.Entities;
using Projet.Domain.Enums;

namespace Projet.Application.Commands.Auth
{
    public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponse>
    {
        private readonly IUserRepository _userRepository;
        private readonly IJwtService _jwtService;
        private readonly IPasswordHasher _passwordHasher;
        private readonly ILogger<LoginCommandHandler> _logger;

        public LoginCommandHandler(
            IUserRepository userRepository,
            IJwtService jwtService,
            IPasswordHasher passwordHasher,
            ILogger<LoginCommandHandler> logger)
        {
            _userRepository = userRepository;
            _jwtService = jwtService;
            _passwordHasher = passwordHasher;
            _logger = logger;
        }

        public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            try
            {
                // 1. Récupérer l'utilisateur par email
                var user = await _userRepository.GetByEmailAsync(request.Email);
                if (user == null)
                {
                    _logger.LogWarning("Tentative de connexion avec email inexistant: {Email}", request.Email);
                    throw new UnauthorizedAccessException("Identifiants invalides");
                }

                // 2. Vérifier si le compte est actif
                if (!user.IsActive)
                    throw new UnauthorizedAccessException("Ce compte est désactivé");

                // 3. Vérifier si le compte est verrouillé
                if (user.IsLockedOut())
                    throw new UnauthorizedAccessException("Compte temporairement verrouillé. Veuillez réessayer plus tard.");

                // 4. Vérifier le mot de passe
                var isPasswordValid = _passwordHasher.VerifyPassword(
                    request.Password,
                    user.PasswordHash,
                    user.PasswordSalt);

                if (!isPasswordValid)
                {
                    user.RecordFailedLogin();
                    await _userRepository.UpdateAsync(user);

                    _logger.LogWarning("Mot de passe incorrect pour l'utilisateur: {Email}", request.Email);
                    throw new UnauthorizedAccessException("Identifiants invalides");
                }

                // 5. Enregistrer la connexion réussie
                user.RecordSuccessfulLogin();
                await _userRepository.UpdateAsync(user);

                // 6. Générer les tokens
                var token = _jwtService.GenerateToken(user);
                var refreshToken = _jwtService.GenerateRefreshToken();

                // 7. Sauvegarder le refresh token
                var refreshTokenEntity = RefreshToken.Create(
                    user.Id,
                    refreshToken,
                    token.JwtId,
                    DateTime.UtcNow.AddDays(request.RememberMe ? 30 : 7));

                await _userRepository.AddRefreshTokenAsync(refreshTokenEntity);

                _logger.LogInformation("Connexion réussie pour l'utilisateur: {Email}", request.Email);

                // 8. Retourner la réponse
                return new AuthResponse
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    UserName = user.Username,
                    Role = user.Role.ToString(),
                    RoleDisplayName = user.Role.GetDisplayName(),
                    profileImageUrl = user.ProfileImageUrl ?? string.Empty,
                    Token = token.Token,
                    RefreshToken = refreshToken,
                    tokenExpiry = token.ExpiryDate,
                    IsEmailConfirmed = user.IsEmailVerified
                };
            }
            catch (UnauthorizedAccessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la connexion");
                throw new ApplicationException("Une erreur est survenue lors de la connexion");
            }
        }
    }
}