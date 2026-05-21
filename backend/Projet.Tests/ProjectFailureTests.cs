using System;
using System.Threading;
using Task = System.Threading.Tasks.Task;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.Project;
using Projet.Domain.Handler.ProjectHandler;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests
{
    public class ProjectFailureTests
    {
        [Fact]
        public async Task CreateProject_Throws_WhenProjectManagerNotFound()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            await using var context = new ApplicationDbContext(options);

            var handler = new CreateProjectCommandHandler(context);

            var cmd = new CreateProjectCommand
            {
                Name = "NewProj",
                Description = "desc",
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(10),
                EstimatedDuration = 10,
                ProjectState = State.todo,
                ProjectManagerId = 999 // does not exist
            };

            await Assert.ThrowsAsync<KeyNotFoundException>(async () => await handler.Handle(cmd, CancellationToken.None));
        }
    }
}
