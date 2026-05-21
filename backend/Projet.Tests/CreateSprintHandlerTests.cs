using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.Sprint;
using Projet.Domain.Handler.Sprint;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests
{
    public class CreateSprintHandlerTests
    {
        [Fact]
        public async System.Threading.Tasks.Task CreateSprint_CreatesSprint()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            using var context = new ApplicationDbContext(options);

            var project = new Project { id = 1, name = "Proj", description = "d", startDate = DateTime.UtcNow, endDate = DateTime.UtcNow.AddDays(5), estimatedDuration = 5, projectState = State.todo, ProjectManagerId = 1 };
            context.Projects.Add(project);
            await context.SaveChangesAsync();

            var handler = new CreateSprintHandler(context);

            var cmd = new CreateSprintCommand
            {
                Name = "Sprint 1",
                Description = "desc",
                EstimatedDuration = 7,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(7),
                ProjectId = project.id,
                SprintState = State.todo
            };

            var id = await handler.Handle(cmd, CancellationToken.None);

            id.Should().BeGreaterThan(0);
            context.Sprints.Any(s => s.Id == id).Should().BeTrue();
        }
    }
}
