using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.TaskCRUD;
using Projet.Domain.Handler.TaskHandler;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests
{
    public class CreateTaskCommandHandlerTests
    {
        [Fact]
        public async System.Threading.Tasks.Task CreateTask_CreatesTask()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            using var context = new ApplicationDbContext(options);

            // Seed a user story
            var us = new UserStory { Title = "US", Description = "d", StoryPoints = 1, Priority = 1, SprintId = 0, ProjectId = 0, CreatedById = 1, CreatedAt = DateTime.UtcNow };
            context.UserStories.Add(us);
            await context.SaveChangesAsync();

            var handler = new CreateTaskCommandHandler(context);

            var cmd = new CreateTaskCommand
            {
                Title = "Task1",
                Description = "Desc",
                EstimatedHours = 3,
                Complexity = 1,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(1),
                UserStoryId = us.Id
            };

            var id = await handler.Handle(cmd, CancellationToken.None);

            id.Should().BeGreaterThan(0);
            context.Tasks.Any(t => t.Id == id).Should().BeTrue();
        }
    }
}
