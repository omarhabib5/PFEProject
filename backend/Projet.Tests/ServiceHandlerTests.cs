using System;
using System.Threading;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using MediatR;
using Projet.Application.Context;
using Projet.Domain.Command.Service;
using Projet.Domain.Handler.ServiceHandler;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests
{
    public class ServiceHandlerTests
    {
        private static ApplicationDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new ApplicationDbContext(options);
        }

        [Fact]
        public async System.Threading.Tasks.Task CreateService_Throws_WhenNameAlreadyExists()
        {
            await using var context = CreateContext();
            context.Services.Add(new Service { id = 1, name = "IT" });
            await context.SaveChangesAsync();

            var handler = new CreateServiceCommandHandler(context);
            var command = new CreateServiceCommand { name = " it " };

            var action = async () => await handler.Handle(command, CancellationToken.None);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("A service with this name already exists.");
        }

        [Fact]
        public async System.Threading.Tasks.Task UpdateService_Throws_WhenNameAlreadyExistsOnAnotherService()
        {
            await using var context = CreateContext();
            context.Services.AddRange(
                new Service { id = 1, name = "IT" },
                new Service { id = 2, name = "HR" });
            await context.SaveChangesAsync();

            var handler = new UpdateServiceCommandHandler(context);
            var command = new UpdateServiceCommand { id = 2, name = "it" };

            var action = async () => await handler.Handle(command, CancellationToken.None);

            await action.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("A service with this name already exists.");
        }

        [Fact]
        public async System.Threading.Tasks.Task UpdateService_AllowsKeepingSameNameForSameService()
        {
            await using var context = CreateContext();
            context.Services.Add(new Service { id = 1, name = "IT" });
            await context.SaveChangesAsync();

            var handler = new UpdateServiceCommandHandler(context);
            var command = new UpdateServiceCommand { id = 1, name = " it " };

            var result = await handler.Handle(command, CancellationToken.None);

            result.Should().Be(Unit.Value);
            (await context.Services.SingleAsync(s => s.id == 1)).name.Should().Be("it");
        }
    }
}
