using System;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Model;

namespace Projet.Application.Context
{
    public class ApplicationDbContext : DbContext, IApplicationDbSet
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<Project> Projects { get; set; }
        public DbSet<Domain.Model.Task> Tasks { get; set; }
        public DbSet<Service> Services { get; set; }
        public DbSet<Team> Teams { get; set; }
        public DbSet<TeamUser> TeamUser { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);


            modelBuilder.Entity<Project>(entity =>
            {
                entity.HasKey(e => e.id);
                entity.Property(e => e.name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.description).HasMaxLength(1000);

                entity.HasOne(e => e.Service)
                    .WithMany(s => s.Projects)
                    .HasForeignKey(e => e.ServiceId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Team)
                    .WithMany(t => t.Projects)
                    .HasForeignKey(e => e.TeamId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.ProjectManager)
                    .WithMany(u => u.ManagedProjects)
                    .HasForeignKey(e => e.ProjectManagerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });


            modelBuilder.Entity<Domain.Model.Task>(entity =>
            {
                entity.HasKey(e => e.id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.description).HasMaxLength(1000);

                entity.HasOne(e => e.UserStory)
                    .WithMany(us => us.Tasks)
                    .HasForeignKey(e => e.UserStoryId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Sprint)
                    .WithMany(s => s.Tasks)
                    .HasForeignKey(e => e.SprintId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.AssignedTo)
                    .WithMany(u => u.AssignedTasks)
                    .HasForeignKey(e => e.AssignedToId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure TeamUser entity
            modelBuilder.Entity<TeamUser>(entity =>
            {
                entity.HasKey(tu => tu.Id);

                entity.HasOne(tu => tu.User)
                    .WithMany(u => u.TeamUsers)
                    .HasForeignKey(tu => tu.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(tu => tu.team)
                    .WithMany(t => t.TeamUsers)
                    .HasForeignKey(tu => tu.TeamId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(tu => new { tu.UserId, tu.TeamId });
            });


            modelBuilder.Entity<Service>(entity =>
            {
                entity.HasKey(e => e.id);
                entity.Property(e => e.name).IsRequired().HasMaxLength(200);
            });

            modelBuilder.Entity<Team>(entity =>
            {
                entity.HasKey(e => e.id);
                entity.Property(e => e.name).IsRequired().HasMaxLength(200);
            });


            modelBuilder.Entity<Sprint>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired();
                entity.Property(e => e.Description);

                entity.HasOne(e => e.Project)
                    .WithMany(p => p.Sprints)
                    .HasForeignKey(e => e.ProjectId)
                    .OnDelete(DeleteBehavior.Restrict);
            });


            modelBuilder.Entity<UserStory>(entity =>
            {
                entity.HasKey(e => e.id);
                entity.Property(e => e.name).IsRequired();
                entity.Property(e => e.description);


                entity.HasOne(e => e.Sprint)
                    .WithMany(s => s.UserStories)
                    .HasForeignKey(e => e.SprintId)
                    .OnDelete(DeleteBehavior.Restrict);


                entity.HasOne(e => e.Project)
                    .WithMany(p => p.UserStories)
                    .HasForeignKey(e => e.ProjectId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}