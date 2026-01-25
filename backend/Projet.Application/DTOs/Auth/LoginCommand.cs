using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
namespace Projet.Application.DTOs.Auth
{
    public class LoginCommand : IRequest<AuthResponse>
    {
        public string Email { get; }
        public string Password { get; }
        public bool RememberMe { get; }

        public LoginCommand(string email, string password, bool rememberMe)
        {
            Email = email;
            Password = password;
            RememberMe = rememberMe;
        }
        public class RegisterCommand : IRequest<AuthResponse>
        {
            public RegisterRequest RegisterRequest { get; }

            public RegisterCommand(RegisterRequest registerRequest)
            {
                RegisterRequest = registerRequest;
            }
        }
        public class RefreshTokenCommand : IRequest<AuthResponse>
        {
            public string Token { get; }
            public string RefreshToken { get; }

            public RefreshTokenCommand(string token, string refreshToken)
            {
                Token = token;
                RefreshToken = refreshToken;
            }
        }

        public class LogoutCommand : IRequest<Unit>
        {
            public Guid UserId { get; }

            public LogoutCommand(Guid userId)
            {
                UserId = userId;
            }
        }

    }
}
