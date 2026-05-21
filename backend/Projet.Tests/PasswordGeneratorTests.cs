using FluentAssertions;
using Projet.Domain.Utilities;

namespace Projet.Tests;

public class PasswordGeneratorTests
{
    [Fact]
    public void GenerateSecurePassword_ReturnsPasswordWithRequestedLength()
    {
        var password = PasswordGenerator.GenerateSecurePassword(12);

        password.Should().HaveLength(12);
    }

    [Fact]
    public void GenerateSecurePassword_ContainsRequiredCharacterTypes()
    {
        var password = PasswordGenerator.GenerateSecurePassword(12);

        password.Any(char.IsLower).Should().BeTrue();
        password.Any(char.IsUpper).Should().BeTrue();
        password.Any(char.IsDigit).Should().BeTrue();
        password.Any(character => "!@#$%^&*".Contains(character)).Should().BeTrue();
    }

    [Fact]
    public void GenerateSecurePassword_WhenLengthIsLessThanEight_ThrowsArgumentException()
    {
        var action = () => PasswordGenerator.GenerateSecurePassword(7);

        action.Should().Throw<ArgumentException>()
            .WithParameterName("length")
            .WithMessage("Password length must be at least 8 characters*");
    }
}