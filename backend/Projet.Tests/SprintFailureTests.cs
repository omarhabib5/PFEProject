using System;
using System.Threading;
using Task = System.Threading.Tasks.Task;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.Sprint;
using Projet.Domain.Handler.Sprint;
using Xunit;

namespace Projet.Tests
{
    public class SprintFailureTests
    {
        [Fact]
        public async Task CreateSprint_Throws_WhenProjectNotFound()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            await using var context = new ApplicationDbContext(options);

            var handler = new CreateSprintHandler(context);

            var cmd = new CreateSprintCommand
            {
                Name = "Sprint 1",
                Description = "desc",
                EstimatedDuration = 7,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(7),
                ProjectId = 999,
                SprintState = Projet.Domain.Model.State.todo
            };

            await Assert.ThrowsAsync<KeyNotFoundException>(async () => await handler.Handle(cmd, CancellationToken.None));
        }
    }
}
