using MediatR;
using Microsoft.Extensions.Logging;
using Projet.Application.DTOs.Auth;
using Projet.Application.Interfaces;
using Projet.Domain.Entities;
using Projet.Domain.Enums;

namespace Projet.Application.Commands.Auth
{
    public class CreateEmployeeCommand : IRequest<CreateEmployeeResponse>
    {
        public CreateEmployeeRequest Request { get; }

        public CreateEmployeeCommand(CreateEmployeeRequest request)
        {
            Request = request;
        }
    }

    public class CreateEmployeeCommandHandler : IRequestHandler<CreateEmployeeCommand, CreateEmployeeResponse>
    {
        private readonly IUserRepository _userRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IEmailSender _emailSender;
        private readonly ILogger<CreateEmployeeCommandHandler> _logger;

        public CreateEmployeeCommandHandler(
            IUserRepository userRepository,
            IPasswordHasher passwordHasher,
            IEmailSender emailSender,
            ILogger<CreateEmployeeCommandHandler> logger)
        {
            _userRepository = userRepository;
            _passwordHasher = passwordHasher;
            _emailSender = emailSender;
            _logger = logger;
        }

        public async Task<CreateEmployeeResponse> Handle(CreateEmployeeCommand request, CancellationToken cancellationToken)
        {
            var payload = request.Request;

            if (await _userRepository.UserExistsByEmailAsync(payload.Email))
                throw new InvalidOperationException("Un utilisateur avec cet email existe deja");

            var userName = string.IsNullOrWhiteSpace(payload.UserName)
                ? payload.Email.Split('@')[0]
                : payload.UserName;

            if (await _userRepository.UserExistsByUsernameAsync(userName))
                throw new InvalidOperationException("Ce nom d'utilisateur est deja pris");

            var tempPassword = PasswordGenerator.Generate(12);
            var passwordHash = _passwordHasher.HashPassword(tempPassword);

            var user = User.Create(
                payload.FirstName,
                payload.LastName,
                payload.Email,
                userName,
                passwordHash.Hash,
                passwordHash.Salt,
                payload.Role);

            await _userRepository.AddAsync(user);

            var emailSent = await TrySendCredentialsEmail(payload.Email, payload.FirstName, userName, tempPassword);

            _logger.LogInformation("Employee created by admin: {Email} - Role: {Role}", user.Email, user.Role);

            return new CreateEmployeeResponse
            {
                Id = user.Id,
                Email = user.Email,
                UserName = user.Username,
                Role = user.Role.ToString(),
                RoleDisplayName = user.Role.GetDisplayName(),
                EmailSent = emailSent
            };
        }

        private async Task<bool> TrySendCredentialsEmail(string email, string firstName, string userName, string password)
        {
            var subject = "Your account credentials";
            var body = $@"
                <h3>Welcome {firstName}</h3>
                <p>Your account has been created.</p>
                <p><strong>Username:</strong> {userName}</p>
                <p><strong>Temporary password:</strong> {password}</p>
                <p>Please change your password after the first login.</p>
            ";

            try
            {
                await _emailSender.SendAsync(email, subject, body);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send credentials email to {Email}", email);
                return false;
            }
        }

        private static class PasswordGenerator
        {
            private const string Allowed = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

            public static string Generate(int length)
            {
                var result = new char[length];
                using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
                var buffer = new byte[length];
                rng.GetBytes(buffer);

                for (var i = 0; i < length; i++)
                {
                    result[i] = Allowed[buffer[i] % Allowed.Length];
                }

                return new string(result);
            }
        }
    }
}
