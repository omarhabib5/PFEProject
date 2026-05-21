using FluentAssertions;
using Projet.Infrastructure.Service;

namespace Projet.Tests;

public class PasswordHasherTests
{
    [Fact]
    public void HashPassword_ProducesNonEmptyHash_And_VerifyReturnsTrue()
    {
        var hasher = new PasswordHasher();

        var hashed = hasher.HashPassword("P@ssw0rd123");

        hashed.Should().NotBeNullOrEmpty();
        hasher.VerifyPassword("P@ssw0rd123", hashed).Should().BeTrue();
    }

    [Fact]
    public void VerifyPassword_ReturnsFalseForWrongPassword()
    {
        var hasher = new PasswordHasher();
        var hashed = hasher.HashPassword("correct-pass");

        hasher.VerifyPassword("wrong-pass", hashed).Should().BeFalse();
    }
}
