using FluentAssertions;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Projet.Api.Controller;
using Projet.Application.DTOs.Auth;
using Projet.Domain.Command.Auth;
using Projet.Domain.comment;
using Projet.Domain.Model;
using Projet.Domain.Querie.Auth;
using System.Security.Claims;

namespace Projet.Tests;

public class AuthControllerTests
{
    private static AuthController CreateController(Mock<IMediator> mediatorMock)
    {
        var loggerMock = new Mock<ILogger<AuthController>>();
        var controller = new AuthController(mediatorMock.Object, loggerMock.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        return controller;
    }

    private static AuthController CreateAuthenticatedController(Mock<IMediator> mediatorMock, int userId)
    {
        var controller = CreateController(mediatorMock);
        controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(
            new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, userId.ToString())],
                authenticationType: "TestAuth"));

        return controller;
    }

    private static object? GetAnonymousProperty(object? value, string propertyName)
    {
        return value?.GetType().GetProperty(propertyName)?.GetValue(value);
    }

    [Fact]
    public async System.Threading.Tasks.Task Register_ReturnsOk_And_SendsRegisterCommand()
    {
        var mediatorMock = new Mock<IMediator>();
        var expected = new AuthResponse
        {
            UserId = 10,
            Email = "ahmed@example.com",
            FirstName = "Ahmed",
            LastName = "Ahmed",
            Role = UserRole.Employee.ToString(),
            AccessToken = "access-token",
            RefreshToken = "refresh-token",
            AccessTokenExpiresAt = DateTime.UtcNow.AddMinutes(60),
            RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(30)
        };

        mediatorMock
            .Setup(m => m.Send(
                It.Is<RegisterCommand>(c =>
                    c.Email == "ahmed@example.com" &&
                    c.Password == "Password123!" &&
                    c.FirstName == "Ahmed" &&
                    c.LastName == "Ahmed" &&
                    c.Role == "Employee"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var controller = CreateController(mediatorMock);
        var request = new RegisterRequestDto
        {
            Email = "ahmed@example.com",
            Password = "Password123!",
            FirstName = "Ahmed",
            LastName = "Ahmed",
            Role = "Employee"
        };

        var result = await controller.Register(request);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();
        var response = okResult.Value!;
        GetAnonymousProperty(response, "Email").Should().Be("ahmed@example.com");
        GetAnonymousProperty(response, "AccessToken").Should().Be("access-token");
        mediatorMock.VerifyAll();
    }

    [Fact]
    public async System.Threading.Tasks.Task Login_WhenMediatorThrowsUnauthorized_ReturnsUnauthorized()
    {
        var mediatorMock = new Mock<IMediator>();
        mediatorMock
            .Setup(m => m.Send(It.IsAny<LoginCommand>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UnauthorizedAccessException("Invalid email or password"));

        var controller = CreateController(mediatorMock);

        var result = await controller.Login(new LoginRequestDto
        {
            Email = "ahmed@example.com",
            Password = "wrong-password"
        });

        var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        GetAnonymousProperty(unauthorized.Value, "message").Should().Be("Invalid email or password");
    }

    [Fact]
    public async System.Threading.Tasks.Task RefreshToken_ReturnsOk_And_SendsRefreshTokenCommand()
    {
        var mediatorMock = new Mock<IMediator>();
        var expected = new AuthResponse
        {
            UserId = 10,
            Email = "ahmed@example.com",
            FirstName = "Ahmed",
            LastName = "Ahmed",
            Role = UserRole.Employee.ToString(),
            AccessToken = "new-access-token",
            RefreshToken = "new-refresh-token",
            AccessTokenExpiresAt = DateTime.UtcNow.AddMinutes(60),
            RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(30)
        };

        mediatorMock
            .Setup(m => m.Send(
                It.Is<RefreshTokenCommand>(c => c.RefreshToken == "existing-refresh-token"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var controller = CreateController(mediatorMock);

        var result = await controller.RefreshToken(new RefreshTokenRequestDto
        {
            RefreshToken = "existing-refresh-token"
        });

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();
        var response = okResult.Value!;
        GetAnonymousProperty(response, "RefreshToken").Should().Be("new-refresh-token");
        GetAnonymousProperty(response, "AccessToken").Should().Be("new-access-token");
    }

    [Fact]
    public async System.Threading.Tasks.Task Logout_WithAuthenticatedUser_ReturnsOk()
    {
        var mediatorMock = new Mock<IMediator>();
        mediatorMock
            .Setup(m => m.Send(It.Is<LogoutCommand>(c => c.UserId == 77), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var controller = CreateAuthenticatedController(mediatorMock, 77);

        var result = await controller.Logout();

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        GetAnonymousProperty(okResult.Value, "message").Should().Be("Logged out successfully");
    }

    [Fact]
    public async System.Threading.Tasks.Task GetCurrentUser_WithAuthenticatedUser_ReturnsOkUserDto()
    {
        var mediatorMock = new Mock<IMediator>();
        mediatorMock
            .Setup(m => m.Send(It.Is<GetCurrentUserQuery>(q => q.UserId == 77), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User
            {
                Id = 77,
                Email = "ahmed@example.com",
                FirstName = "Ahmed",
                LastName = "Ahmed",
                role = UserRole.Employee
            });

        var controller = CreateAuthenticatedController(mediatorMock, 77);

        var result = await controller.GetCurrentUser();

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();
        var response = okResult.Value!;
        GetAnonymousProperty(response, "Email").Should().Be("ahmed@example.com");
        GetAnonymousProperty(response, "Role").Should().Be(UserRole.Employee.ToString());
    }
}
