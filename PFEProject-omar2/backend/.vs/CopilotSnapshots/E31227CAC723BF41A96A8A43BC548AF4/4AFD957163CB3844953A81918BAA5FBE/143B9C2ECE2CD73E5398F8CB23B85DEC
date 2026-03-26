using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Model;

namespace Projet.Domain.Interface
{
    public interface IApplicationDbSet
    {
        DbSet<Project> Projects { get; }
        DbSet<Model.Task> Tasks { get; }
        DbSet<Service> Services { get; }
        DbSet<Team> Teams { get; }
        DbSet<TeamUser> TeamUser { get; }
        DbSet<User> Users { get; }
        DbSet<Sprint> Sprints { get; }
        DbSet<RefreshToken> RefreshTokens { get; }
        DbSet<UserStory> UserStories { get; }
        Task<int> SaveChangesAsync(CancellationToken cancellationToken);
        DbSet<T> Set<T>() where T : class;
    }
}
