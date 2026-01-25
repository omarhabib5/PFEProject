using Microsoft.EntityFrameworkCore;
using Projet.Domain.Common;
using Projet.Domain.Entities;
using System;
using System.Linq.Expressions;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

namespace Projet.Infrastructure.Persistence
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

            // Configuration globale pour les soft deletes sur le type racine
            modelBuilder.Entity<BaseEntity>()
                .HasQueryFilter(e => e.IsActive);
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            foreach (var entry in ChangeTracker.Entries<BaseEntity>())
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        // Setters inaccessibles: on passe par les propriétés du ChangeTracker
                        entry.Property("CreatAt").CurrentValue = DateTime.UtcNow;
                        entry.Property("IsActive").CurrentValue = true;
                        break;
                    case EntityState.Modified:
                        entry.Property("UpdatedAt").CurrentValue = DateTime.UtcNow;
                        break;
                }
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}