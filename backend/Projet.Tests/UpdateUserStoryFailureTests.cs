using System;
using System.Threading;
using Task = System.Threading.Tasks.Task;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.UserStory;
using Projet.Domain.Handler.UserStory;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests;

public class UpdateUserStoryFailureTests
{
    [Fact]
    public async Task UpdateUserStory_Throws_WhenTitleAlreadyExistsInSameProject()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new ApplicationDbContext(options);

        var project = new Project { id = 1, name = "P", description = "d", startDate = DateTime.UtcNow, endDate = DateTime.UtcNow.AddDays(1), estimatedDuration = 1, projectState = State.todo, ProjectManagerId = 1 };
        context.Projects.Add(project);

        var sprint = new Sprint { Id = 1, Name = "S1", Description = "s", estimatedDuration = 1, startDate = DateTime.UtcNow, endDate = DateTime.UtcNow.AddDays(7), ProjectId = project.id, SprintState = State.todo };
        context.Sprints.Add(sprint);

        context.UserStories.AddRange(
            new UserStory
            {
                Id = 1,
                Title = "Story A",
                Description = "Existing",
                StoryPoints = 3,
                Priority = 2,
                SprintId = sprint.Id,
                ProjectId = project.id,
                CreatedById = 1,
                CreatedAt = DateTime.UtcNow,
                Status = State.todo,
                EstimatedDuration = 1
            },
            new UserStory
            {
                Id = 2,
                Title = "Story B",
                Description = "Target",
                StoryPoints = 5,
                Priority = 1,
                SprintId = sprint.Id,
                ProjectId = project.id,
                CreatedById = 1,
                CreatedAt = DateTime.UtcNow,
                Status = State.todo,
                EstimatedDuration = 1
            });

        await context.SaveChangesAsync();

        var handler = new UpdateUserStoryHandler(context);

        var cmd = new UpdateUserStoryCommand
        {
            Id = 2,
            Title = " story a "
        };

        await Assert.ThrowsAsync<InvalidOperationException>(async () => await handler.Handle(cmd, CancellationToken.None));
    }

    [Fact]
    public async Task UpdateUserStory_Throws_WhenSprintChangeCreatesDuplicateTitle()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new ApplicationDbContext(options);

        var project = new Project { id = 1, name = "P", description = "d", startDate = DateTime.UtcNow, endDate = DateTime.UtcNow.AddDays(1), estimatedDuration = 1, projectState = State.todo, ProjectManagerId = 1 };
        context.Projects.Add(project);

        var sourceSprint = new Sprint { Id = 1, Name = "S1", Description = "s", estimatedDuration = 1, startDate = DateTime.UtcNow, endDate = DateTime.UtcNow.AddDays(7), ProjectId = project.id, SprintState = State.todo };
        var targetSprint = new Sprint { Id = 2, Name = "S2", Description = "s2", estimatedDuration = 1, startDate = DateTime.UtcNow, endDate = DateTime.UtcNow.AddDays(7), ProjectId = project.id, SprintState = State.todo };
        context.Sprints.AddRange(sourceSprint, targetSprint);

        context.UserStories.AddRange(
            new UserStory
            {
                Id = 1,
                Title = "Story A",
                Description = "Existing",
                StoryPoints = 3,
                Priority = 2,
                SprintId = sourceSprint.Id,
                ProjectId = project.id,
                CreatedById = 1,
                CreatedAt = DateTime.UtcNow,
                Status = State.todo,
                EstimatedDuration = 1
            },
            new UserStory
            {
                Id = 2,
                Title = "Story B",
                Description = "Target",
                StoryPoints = 5,
                Priority = 1,
                SprintId = sourceSprint.Id,
                ProjectId = project.id,
                CreatedById = 1,
                CreatedAt = DateTime.UtcNow,
                Status = State.todo,
                EstimatedDuration = 1
            },
            new UserStory
            {
                Id = 3,
                Title = "Story B",
                Description = "Target other sprint",
                StoryPoints = 4,
                Priority = 1,
                SprintId = targetSprint.Id,
                ProjectId = project.id,
                CreatedById = 1,
                CreatedAt = DateTime.UtcNow,
                Status = State.todo,
                EstimatedDuration = 1
            });

        await context.SaveChangesAsync();

        var handler = new UpdateUserStoryHandler(context);

        var cmd = new UpdateUserStoryCommand
        {
            Id = 2,
            SprintId = targetSprint.Id
        };

        await Assert.ThrowsAsync<InvalidOperationException>(async () => await handler.Handle(cmd, CancellationToken.None));
    }
}