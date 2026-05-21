using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;
using Projet.Application.Context;
using Projet.Domain.Interface;
using Projet.Domain.Model;
using Projet.Infrastructure.Service;

namespace Projet.Tests;

public class AuthenticationServiceTests
{
    private static ApplicationDbContext CreateContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        return new ApplicationDbContext(options);
    }

    private static AuthenticationService CreateService(
        ApplicationDbContext context,
        Mock<IPasswordHasher> passwordHasherMock,
        Mock<IJwtTokenService> jwtTokenServiceMock,
        Mock<IRefreshTokenRepository> refreshTokenRepositoryMock,
        int refreshTokenExpirationDays = 30,
        int accessTokenExpirationMinutes = 60)
    {
        var settings = Options.Create(new Projet.Domain.comment.JwtSettings
        {
            Secret = "super-secret-key-for-tests-which-is-long-enough",
            Issuer = "test-issuer",
            Audience = "test-audience",
            AccessTokenExpirationMinutes = accessTokenExpirationMinutes,
            RefreshTokenExpirationDays = refreshTokenExpirationDays
        });

        return new AuthenticationService(
            context,
            passwordHasherMock.Object,
            jwtTokenServiceMock.Object,
            refreshTokenRepositoryMock.Object,
            settings);
    }

    [Fact]
    public async System.Threading.Tasks.Task RegisterAsync_CreatesUserAndReturnsTokens()
    {
        await using var context = CreateContext(nameof(RegisterAsync_CreatesUserAndReturnsTokens));
        var passwordHasherMock = new Mock<IPasswordHasher>();
        var jwtTokenServiceMock = new Mock<IJwtTokenService>();
        var refreshTokenRepositoryMock = new Mock<IRefreshTokenRepository>();

        passwordHasherMock.Setup(x => x.HashPassword("Password123!"))
            .Returns("hashed-password");
        jwtTokenServiceMock.Setup(x => x.GenerateAccessToken(It.IsAny<User>()))
            .Returns("access-token");
        jwtTokenServiceMock.Setup(x => x.GenerateRefreshToken())
            .Returns("refresh-token");
        refreshTokenRepositoryMock.Setup(x => x.CreateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RefreshToken token, CancellationToken _) => token);

        var service = CreateService(context, passwordHasherMock, jwtTokenServiceMock, refreshTokenRepositoryMock);

        var response = await service.RegisterAsync(
            email: "ahmed@example.com",
            password: "Password123!",
            firstName: "Ahmed",
            lastName: "Ahmed",
            role: "Employee");

        response.Email.Should().Be("ahmed@example.com");
        response.FirstName.Should().Be("Ahmed");
        response.LastName.Should().Be("Ahmed");
        response.Role.Should().Be(UserRole.Employee.ToString());
        response.AccessToken.Should().Be("access-token");
        response.RefreshToken.Should().Be("refresh-token");

        var storedUser = await context.Users.SingleAsync();
        storedUser.PasswordHash.Should().Be("hashed-password");
        storedUser.role.Should().Be(UserRole.Employee);
        refreshTokenRepositoryMock.Verify(x => x.CreateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async System.Threading.Tasks.Task RegisterAsync_WhenEmailExists_ThrowsInvalidOperationException()
    {
        await using var context = CreateContext(nameof(RegisterAsync_WhenEmailExists_ThrowsInvalidOperationException));
        context.Users.Add(new User
        {
            Email = "ahmed@example.com",
            FirstName = "Ahmed",
            LastName = "Ahmed",
            PasswordHash = "existing",
            role = UserRole.Employee
        });
        await context.SaveChangesAsync();

        var passwordHasherMock = new Mock<IPasswordHasher>();
        var jwtTokenServiceMock = new Mock<IJwtTokenService>();
        var refreshTokenRepositoryMock = new Mock<IRefreshTokenRepository>();
        var service = CreateService(context, passwordHasherMock, jwtTokenServiceMock, refreshTokenRepositoryMock);

        var action = async () => await service.RegisterAsync(
            email: "ahmed@example.com",
            password: "Password123!",
            firstName: "Ahmed",
            lastName: "Ahmed",
            role: "Employee");

        await action.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("User with this email already exists");
    }

    [Fact]
    public async System.Threading.Tasks.Task LoginAsync_WithValidPassword_ReturnsAuthResponse()
    {
        await using var context = CreateContext(nameof(LoginAsync_WithValidPassword_ReturnsAuthResponse));
        var user = new User
        {
            Email = "ahmed@example.com",
            FirstName = "Ahmed",
            LastName = "Ahmed",
            PasswordHash = "hashed-password",
            role = UserRole.Employee
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var passwordHasherMock = new Mock<IPasswordHasher>();
        var jwtTokenServiceMock = new Mock<IJwtTokenService>();
        var refreshTokenRepositoryMock = new Mock<IRefreshTokenRepository>();

        passwordHasherMock.Setup(x => x.VerifyPassword("Password123!", "hashed-password"))
            .Returns(true);
        jwtTokenServiceMock.Setup(x => x.GenerateAccessToken(It.IsAny<User>()))
            .Returns("access-token");
        jwtTokenServiceMock.Setup(x => x.GenerateRefreshToken())
            .Returns("refresh-token");
        refreshTokenRepositoryMock.Setup(x => x.CreateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RefreshToken token, CancellationToken _) => token);

        var service = CreateService(context, passwordHasherMock, jwtTokenServiceMock, refreshTokenRepositoryMock);

        var response = await service.LoginAsync("ahmed@example.com", "Password123!");

        response.Email.Should().Be("ahmed@example.com");
        response.AccessToken.Should().Be("access-token");
        response.RefreshToken.Should().Be("refresh-token");
        user.LastLoginAt.Should().NotBeNull();
        user.FailedLoginAttempts.Should().Be(0);
        refreshTokenRepositoryMock.Verify(x => x.CreateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async System.Threading.Tasks.Task LoginAsync_WithInvalidPassword_IncrementsFailedAttempts()
    {
        await using var context = CreateContext(nameof(LoginAsync_WithInvalidPassword_IncrementsFailedAttempts));
        var user = new User
        {
            Email = "ahmed@example.com",
            FirstName = "Ahmed",
            LastName = "Ahmed",
            PasswordHash = "hashed-password",
            role = UserRole.Employee
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var passwordHasherMock = new Mock<IPasswordHasher>();
        var jwtTokenServiceMock = new Mock<IJwtTokenService>();
        var refreshTokenRepositoryMock = new Mock<IRefreshTokenRepository>();

        passwordHasherMock.Setup(x => x.VerifyPassword("WrongPassword!", "hashed-password"))
            .Returns(false);

        var service = CreateService(context, passwordHasherMock, jwtTokenServiceMock, refreshTokenRepositoryMock);

        var action = async () => await service.LoginAsync("ahmed@example.com", "WrongPassword!");

        await action.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Invalid email or password");

        user.FailedLoginAttempts.Should().Be(1);
        refreshTokenRepositoryMock.Verify(x => x.CreateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async System.Threading.Tasks.Task RefreshTokenAsync_WithActiveToken_ReturnsNewTokens()
    {
        await using var context = CreateContext(nameof(RefreshTokenAsync_WithActiveToken_ReturnsNewTokens));
        var user = new User
        {
            Id = 7,
            Email = "ahmed@example.com",
            FirstName = "Ahmed",
            LastName = "Ahmed",
            PasswordHash = "hashed-password",
            role = UserRole.Employee
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var storedToken = new RefreshToken
        {
            Token = "existing-refresh-token",
            UserId = 7,
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            CreatedAt = DateTime.UtcNow
        };

        var passwordHasherMock = new Mock<IPasswordHasher>();
        var jwtTokenServiceMock = new Mock<IJwtTokenService>();
        var refreshTokenRepositoryMock = new Mock<IRefreshTokenRepository>();

        jwtTokenServiceMock.Setup(x => x.GenerateAccessToken(It.IsAny<User>()))
            .Returns("new-access-token");
        jwtTokenServiceMock.Setup(x => x.GenerateRefreshToken())
            .Returns("new-refresh-token");
        refreshTokenRepositoryMock.Setup(x => x.GetByTokenAsync("existing-refresh-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(storedToken);
        refreshTokenRepositoryMock.Setup(x => x.RevokeAsync("existing-refresh-token", "Replaced by new token", It.IsAny<CancellationToken>()))
            .Returns(System.Threading.Tasks.Task.CompletedTask);
        refreshTokenRepositoryMock.Setup(x => x.CreateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RefreshToken token, CancellationToken _) => token);

        var service = CreateService(context, passwordHasherMock, jwtTokenServiceMock, refreshTokenRepositoryMock);

        var response = await service.RefreshTokenAsync("existing-refresh-token");

        response.Email.Should().Be("ahmed@example.com");
        response.AccessToken.Should().Be("new-access-token");
        response.RefreshToken.Should().Be("new-refresh-token");
        storedToken.ReplacedByToken.Should().Be("new-refresh-token");
        refreshTokenRepositoryMock.Verify(x => x.RevokeAsync("existing-refresh-token", "Replaced by new token", It.IsAny<CancellationToken>()), Times.Once);
        refreshTokenRepositoryMock.Verify(x => x.CreateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async System.Threading.Tasks.Task LogoutAsync_CallsRepositoryAndReturnsTrue()
    {
        await using var context = CreateContext(nameof(LogoutAsync_CallsRepositoryAndReturnsTrue));
        var passwordHasherMock = new Mock<IPasswordHasher>();
        var jwtTokenServiceMock = new Mock<IJwtTokenService>();
        var refreshTokenRepositoryMock = new Mock<IRefreshTokenRepository>();
        refreshTokenRepositoryMock.Setup(x => x.RevokeAllByUserIdAsync(7, "User logout", It.IsAny<CancellationToken>()));

        var service = CreateService(context, passwordHasherMock, jwtTokenServiceMock, refreshTokenRepositoryMock);

        var result = await service.LogoutAsync(7);
        
        result.Should().BeTrue();
        refreshTokenRepositoryMock.Verify(x => x.RevokeAllByUserIdAsync(7, "User logout", It.IsAny<CancellationToken>()), Times.Once);
    }
}