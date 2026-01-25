
using Projet.Domain.Common;
using Projet.Domain.Enums;
using Projet.Domain.Events;

namespace Projet.Domain.Entities
{
    public class User : BaseEntity
    {
        // Propriétés
        public string FirstName { get; private set; } = string.Empty;
        public string LastName { get; private set; } = string.Empty;
        public string Email { get; private set; } = string.Empty;
        public string Username { get; private set; } = string.Empty;
        public string PasswordHash { get; private set; } = string.Empty;
        public string PasswordSalt { get; private set; } = string.Empty;
        public UserRole Role { get; private set; }
        public string? ProfileImageUrl { get; private set; }
        public bool IsEmailVerified { get; private set; }
        public DateTime? EmailVerifiedAt { get; private set; }
        public DateTime? LastLoginAt { get; private set; }
        public int FailedLoginAttempts { get; private set; }
        public DateTime? LockoutEnd { get; private set; }

        // Navigation properties
        private readonly List<RefreshToken> _refreshTokens = new();
        public IReadOnlyCollection<RefreshToken> RefreshTokens => _refreshTokens.AsReadOnly();

        private readonly List<ProjectRole> _projectMemberships = new();
        public IReadOnlyCollection<ProjectRole> ProjectMemberships => _projectMemberships.AsReadOnly();

        // Constructeur privé pour EF
        private User() { }

        // Factory method
        public static User Create(
            string firstName,
            string lastName,
            string email,
            string username,
            string passwordHash,
            string passwordSalt,
            UserRole role)
        {
            if (string.IsNullOrWhiteSpace(firstName))
                throw new ArgumentException("Le prénom est requis", nameof(firstName));

            if (string.IsNullOrWhiteSpace(lastName))
                throw new ArgumentException("Le nom est requis", nameof(lastName));

            if (string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("L'email est requis", nameof(email));

            var user = new User
            {
                Id = Guid.NewGuid(),
                FirstName = firstName.Trim(),
                LastName = lastName.Trim(),
                Email = email.ToLower().Trim(),
                Username = username.ToLower().Trim(),
                PasswordHash = passwordHash,
                PasswordSalt = passwordSalt,
                Role = role,
                CreatAt = DateTime.UtcNow,
                IsActive = true
            };

            user.AddDomainEvent(new UserCreatedEvent(user.Id, user.Email));
            return user;
        }

        // Méthodes métier
        public void UpdateProfile(string firstName, string lastName, string email)
        {
            if (string.IsNullOrWhiteSpace(firstName))
                throw new ArgumentException("Le prénom est requis", nameof(firstName));

            FirstName = firstName.Trim();
            LastName = lastName.Trim();
            Email = email.ToLower().Trim();

            UpdatedAt = DateTime.UtcNow;
        }

        public void UpdateProfileImage(string imageUrl)
        {
            ProfileImageUrl = imageUrl;
            UpdatedAt = DateTime.UtcNow;
        }

        public void VerifyEmail()
        {
            IsEmailVerified = true;
            EmailVerifiedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }

        public void RecordSuccessfulLogin()
        {
            LastLoginAt = DateTime.UtcNow;
            FailedLoginAttempts = 0;
            LockoutEnd = null;
        }

        public void RecordFailedLogin()
        {
            FailedLoginAttempts++;

            if (FailedLoginAttempts >= 5)
            {
                LockoutEnd = DateTime.UtcNow.AddMinutes(15);
            }

            UpdatedAt = DateTime.UtcNow;
        }

        public bool IsLockedOut()
        {
            return LockoutEnd.HasValue && LockoutEnd.Value > DateTime.UtcNow;
        }

        public void AddRefreshToken(RefreshToken refreshToken)
        {
            _refreshTokens.Add(refreshToken);
        }

        public void RevokeRefreshToken(string token)
        {
            var refreshToken = _refreshTokens.FirstOrDefault(rt => rt.Token == token);
            if (refreshToken != null)
            {
                refreshToken.Revoke();
            }
        }

        public void RevokeAllRefreshTokens()
        {
            foreach (var token in _refreshTokens.Where(rt => rt.IsActive))
            {
                token.Revoke();
            }
        }

        // Propriétés calculées
        public string FullName => $"{FirstName} {LastName}";
        public string Initials => $"{FirstName[0]}{LastName[0]}".ToUpper();
    }
}