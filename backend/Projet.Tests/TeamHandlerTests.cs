using System;
using System.Threading;
using Task = System.Threading.Tasks.Task;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.Team;
using Projet.Domain.Handler.TeamHandler;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests
{
    public class TeamHandlerTests
    {
        [Fact]
        public async Task CreateTeam_CreatesTeam_WhenServiceExists()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            await using var context = new ApplicationDbContext(options);

            var service = new Service { id = 1, name = "SVC" };
            context.Services.Add(service);
            await context.SaveChangesAsync();

            var handler = new CreateTeamCommandHandler(context);

            var cmd = new CreateTeamCommand { name = "Team A", ServiceId = service.id };

            var id = await handler.Handle(cmd, CancellationToken.None);

            id.Should().BeGreaterThan(0);
            context.Teams.Should().Contain(t => t.id == id && t.ServiceId == service.id);
        }

        [Fact]
        public async Task CreateTeam_Throws_WhenServiceNotFound()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            await using var context = new ApplicationDbContext(options);

            var handler = new CreateTeamCommandHandler(context);

            var cmd = new CreateTeamCommand { name = "Team B", ServiceId = 999 };

            await Assert.ThrowsAsync<KeyNotFoundException>(async () => await handler.Handle(cmd, CancellationToken.None));
        }
    }
}
