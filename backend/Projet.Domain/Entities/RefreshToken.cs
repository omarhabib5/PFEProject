using Projet.Domain.Common;
using System;

namespace Projet.Domain.Entities
{
    public class RefreshToken : BaseEntity
    {
        public Guid UserId { get; private set; }
        public string Token { get; private set; } = string.Empty;
        // JWT ID (JTI)
        public string Jti { get; private set; } = string.Empty;
        public bool IsUsed { get; private set; }
        public bool IsRevoked { get; private set; }
        public DateTime ExpiresAt { get; private set; }

        public User User { get; private set; } = null!;

        private RefreshToken() { }

        public static RefreshToken Create(Guid userId, string token, string jti, DateTime expiresAt)
        {
            if (string.IsNullOrWhiteSpace(token))
                throw new ArgumentException("Token cannot be empty.", nameof(token));
            if (string.IsNullOrWhiteSpace(jti))
                throw new ArgumentException("JTI cannot be empty.", nameof(jti));

            var refreshToken = new RefreshToken
            {
                UserId = userId,
                Token = token,
                Jti = jti,
                ExpiresAt = expiresAt,
                IsUsed = false,
                IsRevoked = false,
                CreatAt = DateTime.UtcNow
            };
            return refreshToken;
        }

        public void MarkAsUsed()
        {
            IsUsed = true;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Revoke()
        {
            IsRevoked = true;
            UpdatedAt = DateTime.UtcNow;
        }

        public bool IsExpired()
        {
            return DateTime.UtcNow >= ExpiresAt;
        }

        // Renommé pour éviter de masquer BaseEntity.IsActive
        public bool IsUsable()
        {
            return !IsRevoked && !IsUsed && !IsExpired();
        }
    }
}
