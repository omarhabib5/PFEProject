using System;
using System.Linq;
using System.Threading;
using Task = System.Threading.Tasks.Task;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.TaskCRUD;
using Projet.Domain.Handler.TaskHandler;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests
{
    public class CreateTaskAdditionalTests
    {
        [Fact]
        public async Task CreateTask_SetsSprintId_WhenProvided()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            using var context = new ApplicationDbContext(options);

            var sprint = new Sprint { Id = 1, Name = "S1", Description = "s", estimatedDuration = 1, startDate = DateTime.UtcNow, endDate = DateTime.UtcNow.AddDays(7), ProjectId = 1, SprintState = State.todo };
            context.Sprints.Add(sprint);
            await context.SaveChangesAsync();

            var handler = new CreateTaskCommandHandler(context);

            var cmd = new CreateTaskCommand
            {
                Title = "TaskWithSprint",
                Description = "Desc",
                EstimatedHours = 3,
                Complexity = 1,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(1),
                SprintId = sprint.Id
            };

            var id = await handler.Handle(cmd, CancellationToken.None);

            id.Should().BeGreaterThan(0);
            context.Tasks.Any(t => t.Id == id && t.SprintId == sprint.Id).Should().BeTrue();
        }

        [Fact]
        public async Task CreateTask_Throws_WhenDuplicateTitleExistsInSameSprint()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            using var context = new ApplicationDbContext(options);

            var sprint = new Sprint { Id = 1, Name = "S1", Description = "s", estimatedDuration = 1, startDate = DateTime.UtcNow, endDate = DateTime.UtcNow.AddDays(7), ProjectId = 1, SprintState = State.todo };
            var userStory = new UserStory { Id = 1, Title = "US1", Description = "d", StoryPoints = 1, Priority = 1, SprintId = sprint.Id, ProjectId = 1, CreatedById = 1, CreatedAt = DateTime.UtcNow };
            context.Sprints.Add(sprint);
            context.UserStories.Add(userStory);
            context.Tasks.Add(new Domain.Model.Task
            {
                Title = "Duplicate Task",
                Description = "Existing",
                EstimatedHours = 2,
                Complexity = 1,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(1),
                Status = State.todo,
                UserStoryId = userStory.Id,
                SprintId = sprint.Id,
                CreatedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            var handler = new CreateTaskCommandHandler(context);

            var cmd = new CreateTaskCommand
            {
                Title = "Duplicate Task",
                Description = "Desc",
                EstimatedHours = 3,
                Complexity = 1,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(1),
                UserStoryId = userStory.Id,
                SprintId = sprint.Id
            };

            var act = async () => await handler.Handle(cmd, CancellationToken.None);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("A task with the same title already exists in this sprint.");
        }

        [Fact]
        public async Task UpdateTask_Throws_WhenDuplicateTitleExistsInSameSprint()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            using var context = new ApplicationDbContext(options);

            var sprint = new Sprint { Id = 1, Name = "S1", Description = "s", estimatedDuration = 1, startDate = DateTime.UtcNow, endDate = DateTime.UtcNow.AddDays(7), ProjectId = 1, SprintState = State.todo };
            var userStory = new UserStory { Id = 1, Title = "US1", Description = "d", StoryPoints = 1, Priority = 1, SprintId = sprint.Id, ProjectId = 1, CreatedById = 1, CreatedAt = DateTime.UtcNow };
            var taskToUpdate = new Domain.Model.Task
            {
                Id = 1,
                Title = "Original Task",
                Description = "Existing task",
                EstimatedHours = 2,
                Complexity = 1,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(1),
                Status = State.todo,
                UserStoryId = userStory.Id,
                SprintId = sprint.Id,
                CreatedAt = DateTime.UtcNow
            };
            context.Sprints.Add(sprint);
            context.UserStories.Add(userStory);
            context.Tasks.AddRange(
                taskToUpdate,
                new Domain.Model.Task
                {
                    Id = 2,
                    Title = "Duplicate Task",
                    Description = "Other task",
                    EstimatedHours = 2,
                    Complexity = 1,
                    StartDate = DateTime.UtcNow,
                    EndDate = DateTime.UtcNow.AddDays(1),
                    Status = State.todo,
                    UserStoryId = userStory.Id,
                    SprintId = sprint.Id,
                    CreatedAt = DateTime.UtcNow
                });
            await context.SaveChangesAsync();

            var handler = new UpdateTaskCommandHandler(context);

            var cmd = new UpdateTaskCommand
            {
                Id = taskToUpdate.Id,
                Title = "Duplicate Task",
                Description = "Updated description",
                EstimatedHours = 4,
                Complexity = 2,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(2),
                Status = State.inProgress,
                UserStoryId = userStory.Id,
                SprintId = sprint.Id
            };

            var act = async () => await handler.Handle(cmd, CancellationToken.None);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("A task with the same title already exists in this sprint.");
        }
    }
}
