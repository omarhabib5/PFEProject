using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.Project;
using Projet.Domain.Handler.ProjectHandler;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests
{
    public class CreateProjectCommandHandlerTests
    {
        [Fact]
        public async System.Threading.Tasks.Task CreateProject_CreatesProject()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            using var context = new ApplicationDbContext(options);

            // Seed a user to act as project manager
            var manager = new User { FirstName = "Ahmed", LastName = "PM", Email = "pm@example.com", PasswordHash = "h", role = UserRole.ProjectManager };
            context.Users.Add(manager);
            await context.SaveChangesAsync();

            var handler = new CreateProjectCommandHandler(context);

            var cmd = new CreateProjectCommand
            {
                Name = "NewProj",
                Description = "desc",
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(10),
                EstimatedDuration = 10,
                ProjectState = State.todo,
                ProjectManagerId = manager.Id
            };

            var id = await handler.Handle(cmd, CancellationToken.None);

            id.Should().BeGreaterThan(0);
            context.Projects.Any(p => p.id == id).Should().BeTrue();
        }
    }
}
