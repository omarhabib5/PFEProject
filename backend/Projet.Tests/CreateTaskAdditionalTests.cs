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
    }
}
