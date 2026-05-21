using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Model;
using Projet.Infrastructure.Repository;

namespace Projet.Tests;

public class RefreshTokenRepositoryTests
{
    private static ApplicationDbContext CreateContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async System.Threading.Tasks.Task CreateAsync_PersistsToken()
    {
        await using var context = CreateContext(nameof(CreateAsync_PersistsToken));
        var repository = new RefreshTokenRepository(context);
        var user = new User
        {
            Email = "ahmed@example.com",
            FirstName = "Ahmed",
            LastName = "Ahmed",
            PasswordHash = "hash",
            role = UserRole.Employee
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var refreshToken = new RefreshToken
        {
            Token = "refresh-token",
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            CreatedAt = DateTime.UtcNow
        };

        var created = await repository.CreateAsync(refreshToken);

        created.Id.Should().BeGreaterThan(0);
        (await context.RefreshTokens.SingleAsync()).Token.Should().Be("refresh-token");
    }

    [Fact]
    public async System.Threading.Tasks.Task GetByTokenAsync_ReturnsTokenWithUser()
    {
        await using var context = CreateContext(nameof(GetByTokenAsync_ReturnsTokenWithUser));
        var repository = new RefreshTokenRepository(context);
        var user = new User
        {
            Email = "ahmed@example.com",
            FirstName = "Ahmed",
            LastName = "Ahmed",
            PasswordHash = "hash",
            role = UserRole.Employee
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var refreshToken = new RefreshToken
        {
            Token = "refresh-token",
            UserId = user.Id,
            User = user,
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            CreatedAt = DateTime.UtcNow
        };
        context.RefreshTokens.Add(refreshToken);
        await context.SaveChangesAsync();

        var found = await repository.GetByTokenAsync("refresh-token");

        found.Should().NotBeNull();
        found!.User.Email.Should().Be("ahmed@example.com");
    }

    [Fact]
    public async System.Threading.Tasks.Task RevokeAsync_MarksTokenAsRevoked()
    {
        await using var context = CreateContext(nameof(RevokeAsync_MarksTokenAsRevoked));
        var repository = new RefreshTokenRepository(context);
        var user = new User
        {
            Email = "ahmed@example.com",
            FirstName = "Ahmed",
            LastName = "Ahmed",
            PasswordHash = "hash",
            role = UserRole.Employee
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var refreshToken = new RefreshToken
        {
            Token = "refresh-token",
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            CreatedAt = DateTime.UtcNow
        };
        context.RefreshTokens.Add(refreshToken);
        await context.SaveChangesAsync();

        await repository.RevokeAsync("refresh-token", "manual revoke");

        refreshToken.RevokedAt.Should().NotBeNull();
        refreshToken.RevokedReason.Should().Be("manual revoke");
    }

    [Fact]
    public async System.Threading.Tasks.Task RevokeAllByUserIdAsync_RevokesActiveTokensOnly()
    {
        await using var context = CreateContext(nameof(RevokeAllByUserIdAsync_RevokesActiveTokensOnly));
        var repository = new RefreshTokenRepository(context);
        var user = new User
        {
            Email = "ahmed@example.com",
            FirstName = "Ahmed",
            LastName = "Ahmed",
            PasswordHash = "hash",
            role = UserRole.Employee
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var activeToken = new RefreshToken
        {
            Token = "active-token",
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            CreatedAt = DateTime.UtcNow
        };
        var expiredToken = new RefreshToken
        {
            Token = "expired-token",
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(-1),
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };
        context.RefreshTokens.AddRange(activeToken, expiredToken);
        await context.SaveChangesAsync();

        await repository.RevokeAllByUserIdAsync(user.Id, "logout");

        activeToken.RevokedAt.Should().NotBeNull();
        activeToken.RevokedReason.Should().Be("logout");
        expiredToken.RevokedAt.Should().BeNull();
    }

    [Fact]
    public async System.Threading.Tasks.Task GetActiveTokensByUserIdAsync_ReturnsOnlyActiveTokens()
    {
        await using var context = CreateContext(nameof(GetActiveTokensByUserIdAsync_ReturnsOnlyActiveTokens));
        var repository = new RefreshTokenRepository(context);
        var user = new User
        {
            Email = "ahmed@example.com",
            FirstName = "Ahmed",
            LastName = "Ahmed",
            PasswordHash = "hash",
            role = UserRole.Employee
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var activeToken = new RefreshToken
        {
            Token = "active-token",
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            CreatedAt = DateTime.UtcNow
        };
        var revokedToken = new RefreshToken
        {
            Token = "revoked-token",
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            CreatedAt = DateTime.UtcNow,
            RevokedAt = DateTime.UtcNow
        };
        context.RefreshTokens.AddRange(activeToken, revokedToken);
        await context.SaveChangesAsync();

        var tokens = await repository.GetActiveTokensByUserIdAsync(user.Id);

        tokens.Should().ContainSingle();
        tokens[0].Token.Should().Be("active-token");
    }
}
