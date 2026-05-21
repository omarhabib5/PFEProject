using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Projet.Application.Context;
using Projet.Domain.Command.User;
using Projet.Domain.Handler.UserHandler;
using Projet.Domain.Interface;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests
{
    public class CreateUserHandlerTests
    {
        [Fact]
        public async System.Threading.Tasks.Task CreateUser_CreatesUser()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            using var context = new ApplicationDbContext(options);

            var hasher = new Mock<IPasswordHasher>();
            hasher.Setup(h => h.HashPassword(It.IsAny<string>())).Returns("hashed");

            var handler = new CreateUserHandler(context, hasher.Object);

            var cmd = new CreateUserCommand
            {
                FirstName = "Ahmed",
                LastName = "Test",
                Email = "ahmed.user@example.com",
                Password = "P@ssw0rd",
                Role = UserRole.Employee
            };

            var user = await handler.Handle(cmd, CancellationToken.None);

            user.Should().NotBeNull();
            user.Id.Should().BeGreaterThan(0);
            context.Users.Any(u => u.Email == cmd.Email).Should().BeTrue();
        }
    }
}
