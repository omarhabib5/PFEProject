using System;
using System.Threading;
using Task = System.Threading.Tasks.Task;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.UserStory;
using Projet.Domain.Handler.UserStory;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests
{
    public class CreateUserStoryFailureTests
    {
        [Fact]
        public async Task CreateUserStory_Throws_WhenSprintNotFound()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            await using var context = new ApplicationDbContext(options);

            var handler = new CreateUserStoryHandler(context);

            var cmd = new CreateUserStoryCommand
            {
                Title = "Story",
                Description = "Desc",
                AcceptanceCriteria = "AC",
                StoryPoints = 3,
                Priority = 2,
                SprintId = 999, // sprint missing
                CreatedById = 1
            };

            await Assert.ThrowsAsync<KeyNotFoundException>(async () => await handler.Handle(cmd, CancellationToken.None));
        }

        [Fact]
        public async Task CreateUserStory_Throws_WhenAssignedUserNotFound()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            await using var context = new ApplicationDbContext(options);

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
                CreatedById = 1,
                AssignedToId = 999 // user missing
            };

            await Assert.ThrowsAsync<KeyNotFoundException>(async () => await handler.Handle(cmd, CancellationToken.None));
        }
    }
}
