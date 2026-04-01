using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Projet.Application.DTOs.Auth;
using Projet.Domain.Command.Auth;
using Projet.Domain.Querie.Auth;
using System.Security.Claims;

namespace Projet.Api.Controller
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IMediator _mediator;

        public AuthController(IMediator mediator)
        {
            _mediator = mediator;
        }

        private int? GetAuthenticatedUserId()
        {
            var claimValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (int.TryParse(claimValue, out var userIdFromClaims))
            {
                return userIdFromClaims;
            }

            return HttpContext.Items["UserId"] as int?;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            try
            {
                var command = new RegisterCommand
                {
                    Email = request.Email,
                    Password = request.Password,
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Role = request.Role
                };

                var result = await _mediator.Send(command);

                var response = new AuthResponseDto
                {
                    UserId = result.UserId,
                    Email = result.Email,
                    FirstName = result.FirstName,
                    LastName = result.LastName,
                    Role = result.Role,
                    AccessToken = result.AccessToken,
                    RefreshToken = result.RefreshToken,
                    AccessTokenExpiresAt = result.AccessTokenExpiresAt,
                    RefreshTokenExpiresAt = result.RefreshTokenExpiresAt
                };

                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during registration", error = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            try
            {
                var command = new LoginCommand
                {
                    Email = request.Email,
                    Password = request.Password
                };

                var result = await _mediator.Send(command);

                var response = new AuthResponseDto
                {
                    UserId = result.UserId,
                    Email = result.Email,
                    FirstName = result.FirstName,
                    LastName = result.LastName,
                    Role = result.Role,
                    AccessToken = result.AccessToken,
                    RefreshToken = result.RefreshToken,
                    AccessTokenExpiresAt = result.AccessTokenExpiresAt,
                    RefreshTokenExpiresAt = result.RefreshTokenExpiresAt
                };

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during login", error = ex.Message });
            }
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto request)
        {
            try
            {
                var command = new RefreshTokenCommand
                {
                    RefreshToken = request.RefreshToken
                };

                var result = await _mediator.Send(command);

                var response = new AuthResponseDto
                {
                    UserId = result.UserId,
                    Email = result.Email,
                    FirstName = result.FirstName,
                    LastName = result.LastName,
                    Role = result.Role,
                    AccessToken = result.AccessToken,
                    RefreshToken = result.RefreshToken,
                    AccessTokenExpiresAt = result.AccessTokenExpiresAt,
                    RefreshTokenExpiresAt = result.RefreshTokenExpiresAt
                };

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during token refresh", error = ex.Message });
            }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request)
        {
            try
            {
                var command = new ForgotPasswordCommand
                {
                    Email = request.Email
                };

                await _mediator.Send(command);

                return Ok(new { message = "If the account exists, a reset link has been sent." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while processing forgot password", error = ex.Message });
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request)
        {
            try
            {
                var command = new ResetPasswordCommand
                {
                    Token = request.Token,
                    NewPassword = request.NewPassword,
                    ConfirmNewPassword = request.ConfirmNewPassword
                };

                await _mediator.Send(command);
                return Ok(new { message = "Password has been reset successfully" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while resetting password", error = ex.Message });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            try
            {
                var userId = GetAuthenticatedUserId();

                if (userId == null)
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var command = new LogoutCommand
                {
                    UserId = userId.Value
                };

                await _mediator.Send(command);

                return Ok(new { message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during logout", error = ex.Message });
            }
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request)
        {
            try
            {
                var userId = GetAuthenticatedUserId();
                if (userId == null)
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var command = new ChangePasswordCommand
                {
                    UserId = userId.Value,
                    CurrentPassword = request.CurrentPassword,
                    NewPassword = request.NewPassword,
                    ConfirmNewPassword = request.ConfirmNewPassword
                };

                await _mediator.Send(command);
                return Ok(new { message = "Password changed successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while changing password", error = ex.Message });
            }
        }

        [HttpPost("create-employee")]
        [Authorize(Roles = "Admin,ServiceManager")]
        public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeRequest request)
        {
            try
            {
                var command = new CreateEmployeeCommand
                {
                    Email = request.Email,
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Role = request.Role,
                    ServiceId = request.ServiceId
                };

                var result = await _mediator.Send(command);

                var response = new AuthResponseDto
                {
                    UserId = result.UserId,
                    Email = result.Email,
                    FirstName = result.FirstName,
                    LastName = result.LastName,
                    Role = result.Role,
                    AccessToken = result.AccessToken,
                    RefreshToken = result.RefreshToken,
                    AccessTokenExpiresAt = result.AccessTokenExpiresAt,
                    RefreshTokenExpiresAt = result.RefreshTokenExpiresAt
                };

                return CreatedAtAction(nameof(GetCurrentUser), new { id = result.UserId }, new
                {
                    message = "Employee created successfully. Credentials have been sent to their email.",
                    employee = response
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while creating employee", error = ex.Message });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var userId = GetAuthenticatedUserId();

                if (userId == null)
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var query = new GetCurrentUserQuery
                {
                    UserId = userId.Value
                };

                var user = await _mediator.Send(query);

                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                var response = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Role = user.role.ToString()
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }
    }
}

