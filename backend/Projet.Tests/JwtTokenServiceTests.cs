using System;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Projet.Domain.comment;
using Projet.Domain.Model;
using Projet.Infrastructure.Service;
using Xunit;

namespace Projet.Tests;

public class JwtTokenServiceTests
{
    private JwtTokenService CreateService()
    {
        var settings = new JwtSettings
        {
            Secret = "super-secret-key-for-tests-which-is-long-enough",
            Issuer = "test-issuer",
            Audience = "test-audience",
            AccessTokenExpirationMinutes = 60,
            RefreshTokenExpirationDays = 30
        };

        return new JwtTokenService(Options.Create(settings));
    }

    [Fact]
    public void GenerateRefreshToken_ReturnsNonEmptyString()
    {
        var svc = CreateService();

        var token = svc.GenerateRefreshToken();

        token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void GeneratePasswordResetToken_ThenValidate_ReturnsUserId()
    {
        var svc = CreateService();
        var user = new User { Id = 42, FirstName = "Ahmed", LastName = "Ahmed", Email = "ahmed@example.com" };

        var token = svc.GeneratePasswordResetToken(user, expiresInMinutes: 5);

        var validatedUserId = svc.ValidatePasswordResetToken(token);

        validatedUserId.Should().Be(42);
    }

    [Fact]
    public void GenerateAccessToken_PrincipalContainsUserId()
    {
        var svc = CreateService();
        var user = new User { Id = 99, FirstName = "Ahmed", LastName = "Ahmed", Email = "ahmed@example.com", role = UserRole.Employee };

        var accessToken = svc.GenerateAccessToken(user);

        var principal = svc.GetPrincipalFromExpiredToken(accessToken);

        principal.Should().NotBeNull();
        principal!.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value.Should().Be("99");
    }
}
