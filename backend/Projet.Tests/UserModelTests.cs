using System;
using FluentAssertions;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests
{
    public class UserModelTests
    {
        [Fact]
        public void IncrementFailedLoginAttempts_SetsLockoutAfterMaxAttempts()
        {
            var user = new User { FailedLoginAttempts = 4 };

            user.IncrementFailedLoginAttempts(maxAttempts: 5, lockoutMinutes: 60);

            user.FailedLoginAttempts.Should().Be(5);
            user.LockoutEnd.Should().NotBeNull();
            user.IsLockedOut().Should().BeTrue();
        }

        [Fact]
        public void UpdateLastLogin_ResetsFailedAttemptsAndClearsLockout()
        {
            var user = new User { FailedLoginAttempts = 3, LockoutEnd = DateTime.UtcNow.AddMinutes(10) };

            user.UpdateLastLogin();

            user.FailedLoginAttempts.Should().Be(0);
            user.LockoutEnd.Should().BeNull();
            user.LastLoginAt.Should().NotBeNull();
        }
    }
}
