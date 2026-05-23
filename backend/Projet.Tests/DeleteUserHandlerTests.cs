using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.User;
using Projet.Domain.Handler.UserHandler;
using Projet.Domain.Model;
using Xunit;

namespace Projet.Tests
{
    public class DeleteUserHandlerTests
    {
        [Fact]
        public async System.Threading.Tasks.Task DeleteUser_AllowsUserWithCreatedUserStories()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            await using var context = new ApplicationDbContext(options);

            var user = new User
            {
                Id = 1,
                Email = "creator@example.com",
                FirstName = "Creator",
                LastName = "User",
                PasswordHash = "hashed-password",
                role = UserRole.Employee
            };

            var project = new Project
            {
                id = 1,
                name = "Project",
                description = "Desc",
                startDate = DateTime.UtcNow,
                endDate = DateTime.UtcNow.AddDays(7),
                estimatedDuration = 7,
                projectState = State.todo,
                ProjectManagerId = 2
            };

            var sprint = new Sprint
            {
                Id = 1,
                Name = "Sprint 1",
                Description = "Sprint",
                estimatedDuration = 7,
                startDate = DateTime.UtcNow,
                endDate = DateTime.UtcNow.AddDays(7),
                ProjectId = project.id,
                SprintState = State.todo
            };

            var userStory = new UserStory
            {
                Id = 1,
                Title = "Story",
                Description = "Story description",
                StoryPoints = 3,
                Priority = 1,
                Status = State.todo,
                EstimatedDuration = 2,
                CreatedAt = DateTime.UtcNow,
                SprintId = sprint.Id,
                ProjectId = project.id,
                CreatedById = user.Id
            };

            context.Users.Add(user);
            context.Projects.Add(project);
            context.Sprints.Add(sprint);
            context.UserStories.Add(userStory);
            await context.SaveChangesAsync();

            var handler = new DeleteUserHandler(context);

            var result = await handler.Handle(new DeleteUserCommand(user.Id), CancellationToken.None);

            result.Should().BeTrue();
            (await context.Users.AnyAsync(u => u.Id == user.Id)).Should().BeFalse();
        }
    }
}
