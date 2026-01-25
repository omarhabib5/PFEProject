using MediatR;
using Microsoft.Extensions.Logging;
using Projet.Application.DTOs.Auth;
using Projet.Application.Interfaces;
using Projet.Domain.Entities;
using Projet.Domain.Enums;
using static Projet.Application.DTOs.Auth.LoginCommand;

namespace Projet.Application.Commands.Auth
{
    public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResponse>
    {
        private readonly IUserRepository _userRepository;
        private readonly IJwtService _jwtService;
        private readonly IPasswordHasher _passwordHasher;
        private readonly ILogger<RegisterCommandHandler> _logger;

        public RegisterCommandHandler(
            IUserRepository userRepository,
            IJwtService jwtService,
            IPasswordHasher passwordHasher,
            ILogger<RegisterCommandHandler> logger)
        {
            _userRepository = userRepository;
            _jwtService = jwtService;
            _passwordHasher = passwordHasher;
            _logger = logger;
        }

        public async Task<AuthResponse> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var registerRequest = request.RegisterRequest;

                if (await _userRepository.UserExistsByEmailAsync(registerRequest.Email))
                    throw new InvalidOperationException("Un utilisateur avec cet email existe déjà");


                if (await _userRepository.UserExistsByUsernameAsync(registerRequest.UserName))
                    throw new InvalidOperationException("Ce nom d'utilisateur est déjà pris");

                var passwordHash = _passwordHasher.HashPassword(registerRequest.Password);


                var user = User.Create(
                    registerRequest.FirstName,
                    registerRequest.LastName,
                    registerRequest.Email,
                    registerRequest.UserName,
                    passwordHash.Hash,
                    passwordHash.Salt,
                    registerRequest.Role);


                await _userRepository.AddAsync(user);

                var token = _jwtService.GenerateToken(user);
                var refreshToken = _jwtService.GenerateRefreshToken();


                var refreshTokenEntity = RefreshToken.Create(
                    user.Id,
                    refreshToken,
                    token.JwtId,
                    DateTime.UtcNow.AddDays(7));

                await _userRepository.AddRefreshTokenAsync(refreshTokenEntity);

                _logger.LogInformation("Utilisateur créé: {Id} - Email: {Email} - Role: {Role}",
                    user.Id, user.Email, user.Role);

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
            catch (InvalidOperationException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'inscription");
                throw new ApplicationException("Une erreur est survenue lors de l'inscription");
            }
        }
    }
}