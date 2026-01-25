using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Projet.Application.DTOs.Auth;
using Projet.Application.Queries.Auth;
using System.Security.Claims;
using static Projet.Application.DTOs.Auth.LoginCommand;

namespace Projet.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ILogger<AuthController> _logger;
        public AuthController(IMediator mediator, ILogger<AuthController> logger)
        {
            _mediator = mediator;
            _logger = logger;
        }
        [HttpPost("login")]
        [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                var command = new LoginCommand(request.Email, request.Password, request.RememberMe);
                var result = await _mediator.Send(command);

                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Échec de l'authentification: {Message}", ex.Message);
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'authentification");
                return BadRequest(new { message = "Une erreur est survenue" });
            }
        }

        [HttpPost("register")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                var command = new RegisterCommand(request);
                var result = await _mediator.Send(command);

                return CreatedAtAction(nameof(Login), new { email = request.Email }, result);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Échec de l'inscription: {Message}", ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'inscription");
                return BadRequest(new { message = "Une erreur est survenue" });
            }
        }

        [HttpPost("refresh-token")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                var command = new RefreshTokenCommand(request.Token, request.RefreshToken);
                var result = await _mediator.Send(command);

                return Ok(result);
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning("Token invalide: {Message}", ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors du rafraîchissement du token");
                return BadRequest(new { message = "Impossible de rafraîchir le token" });
            }
        }
        [HttpPost("logout")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> Logout()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (Guid.TryParse(userId, out var userGuid))
                {
                    var command = new LogoutCommand(userGuid);
                    await _mediator.Send(command);

                    _logger.LogInformation("Déconnexion de l'utilisateur: {UserId}", userGuid);
                }

                return Ok(new { message = "Déconnexion réussie" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la déconnexion");
                return BadRequest(new { message = "Erreur lors de la déconnexion" });
            }
        }

        [HttpGet("profile")]
        [Authorize]
        [ProducesResponseType(typeof(UserInfoResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                    return Unauthorized();

                var query = new GetUserProfileQuery(userGuid);
                var result = await _mediator.Send(query);

                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning("Utilisateur non trouvé: {Message}", ex.Message);
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération du profil");
                return BadRequest(new { message = "Erreur lors de la récupération du profil" });
            }
        }
    }
}
