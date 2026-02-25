using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Model
{
   public class User
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; } = string.Empty;
        public string? token { get; set; }
        public UserRole role { get; set; }
        public string? ProfileImageUrl { get; set; }
        public bool IsEmailVerified { get; set; }
        public DateTime? EmailVerifiedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public int? Serviceid { get; set; }

        public virtual Service? Service { get; set; }
        public virtual ICollection<Service> ManagedServices { get; set; }
        public int FailedLoginAttempts { get; set; }
        public DateTime? LockoutEnd { get; set; }
        public virtual ICollection<TeamUser> TeamUsers { get; set; }
        public virtual ICollection<Project> ManagedProjects { get; set; }
        public virtual ICollection<Task> AssignedTasks { get; set; }
        public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

        public void UpdatePassword(string passwordHash)
        {
            PasswordHash = passwordHash;
        }

        public void UpdateLastLogin()
        {
            LastLoginAt = DateTime.UtcNow;
            FailedLoginAttempts = 0;
            LockoutEnd = null;
        }

        public void IncrementFailedLoginAttempts(int maxAttempts = 5, int lockoutMinutes = 15)
        {
            FailedLoginAttempts++;
            if (FailedLoginAttempts >= maxAttempts)
            {
                LockoutEnd = DateTime.UtcNow.AddMinutes(lockoutMinutes);
            }
        }

        public bool IsLockedOut()
        {
            return LockoutEnd.HasValue && LockoutEnd.Value > DateTime.UtcNow;
        }
    }
}
