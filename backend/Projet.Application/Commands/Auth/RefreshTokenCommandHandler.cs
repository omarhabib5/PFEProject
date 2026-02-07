using System.Security.Claims;
using MediatR;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Projet.Application.DTOs.Auth;
using Projet.Application.Interfaces;
using Projet.Domain.Entities;
using Projet.Domain.Enums;
using static Projet.Application.DTOs.Auth.LoginCommand;

namespace Projet.Application.Commands.Auth
{
    public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponse>
    {
        private readonly IUserRepository _userRepository;
        private readonly IJwtService _jwtService;
        private readonly ILogger<RefreshTokenCommandHandler> _logger;

        public RefreshTokenCommandHandler(
            IUserRepository userRepository,
            IJwtService jwtService,
            ILogger<RefreshTokenCommandHandler> logger)
        {
            _userRepository = userRepository;
            _jwtService = jwtService;
            _logger = logger;
        }

        public async Task<AuthResponse> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.RefreshToken))
                    throw new SecurityTokenException("Token invalide");

                var principal = _jwtService.GetPrincipalFromExpiredToken(request.Token);
                if (principal == null)
                    throw new SecurityTokenException("Token invalide");

                var userIdValue = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrWhiteSpace(userIdValue) || !Guid.TryParse(userIdValue, out var userId))
                    throw new SecurityTokenException("Token invalide");

                var storedRefreshToken = await _userRepository.GetRefreshTokenAsync(request.RefreshToken);
                if (storedRefreshToken == null || !storedRefreshToken.IsUsable())
                    throw new SecurityTokenException("Refresh token invalide");

                if (storedRefreshToken.UserId != userId)
                    throw new SecurityTokenException("Refresh token invalide");

                var jti = principal.FindFirst("jti")?.Value;
                if (string.IsNullOrWhiteSpace(jti) || storedRefreshToken.Jti != jti)
                    throw new SecurityTokenException("Token invalide");

                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null || !user.IsActive)
                    throw new SecurityTokenException("Utilisateur introuvable");

                await _userRepository.RevokeRefreshTokenAsync(storedRefreshToken);

                var token = _jwtService.GenerateToken(user);
                var refreshToken = _jwtService.GenerateRefreshToken();

                var refreshTokenEntity = RefreshToken.Create(
                    user.Id,
                    refreshToken,
                    token.JwtId,
                    DateTime.UtcNow.AddDays(7));

                await _userRepository.AddRefreshTokenAsync(refreshTokenEntity);

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
            catch (SecurityTokenException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors du refresh token");
                throw new ApplicationException("Une erreur est survenue lors du rafraichissement du token");
            }
        }
    }
}
