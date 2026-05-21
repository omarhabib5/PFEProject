using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.UserStory;
using Projet.Domain.Handler.UserStory;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests
{
    public class CreateUserStoryHandlerTests
    {
        [Fact]
        public async System.Threading.Tasks.Task CreateUserStory_CreatesUserStory()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            using var context = new ApplicationDbContext(options);

            var project = new Project { id = 1, name = "P", description = "d", startDate = DateTime.UtcNow, endDate = DateTime.UtcNow.AddDays(1), estimatedDuration = 1, projectState = State.todo, ProjectManagerId = 1 };
            context.Projects.Add(project);
            await context.SaveChangesAsync();

            var sprint = new Sprint { Id = 1, Name = "S1", Description = "s", estimatedDuration = 1, startDate = DateTime.UtcNow, endDate = DateTime.UtcNow.AddDays(7), ProjectId = project.id, SprintState = State.todo };
            context.Sprints.Add(sprint);
            await context.SaveChangesAsync();

            var handler = new CreateUserStoryHandler(context);

            var cmd = new CreateUserStoryCommand
            {
                Title = "Story",
                Description = "Desc",
                AcceptanceCriteria = "AC",
                StoryPoints = 3,
                Priority = 2,
                SprintId = sprint.Id,
                CreatedById = 1
            };

            var id = await handler.Handle(cmd, CancellationToken.None);

            id.Should().BeGreaterThan(0);
            context.UserStories.Any(us => us.Id == id).Should().BeTrue();
        }
    }
}
