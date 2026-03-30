using System;
using MediatR;
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
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<UserStory> UserStories { get; set; }

        public DbSet<Sprint> Sprints { get; set; }
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
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(1000);

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

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
                entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.PasswordHash).IsRequired();

                entity.HasIndex(e => e.Email).IsUnique();

                entity.HasMany(e => e.RefreshTokens)
                    .WithOne(rt => rt.User)
                    .HasForeignKey(rt => rt.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Token).IsRequired().HasMaxLength(500);
                entity.Property(e => e.ExpiresAt).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();

                entity.HasIndex(e => e.Token).IsUnique();
            });

            modelBuilder.Entity<Service>(entity =>
            {
                entity.HasKey(e => e.id);
                entity.Property(e => e.name).IsRequired().HasMaxLength(200);

                // Relation Service.Members <-> User.Service
                entity.HasMany(s => s.Members)
                    .WithOne(u => u.Service)
                    .HasForeignKey(u => u.Serviceid)
                    .OnDelete(DeleteBehavior.Restrict);

                // Relation Service.Responsible <-> User.ManagedServices
                entity.HasOne(s => s.Responsible)
                    .WithMany(u => u.ManagedServices)
                    .HasForeignKey(s => s.ResponsibleId)
                    .OnDelete(DeleteBehavior.Restrict);
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
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired();
                entity.Property(e => e.Description);


                entity.HasOne(e => e.Sprint)
                    .WithMany(s => s.UserStories)
                    .HasForeignKey(e => e.SprintId)
                    .OnDelete(DeleteBehavior.Restrict);


                entity.HasOne(e => e.Project)
                    .WithMany(p => p.UserStories)
                    .HasForeignKey(e => e.ProjectId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Message).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.Type).IsRequired();
                entity.Property(e => e.IsRead).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.Link).HasMaxLength(500);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Notifications)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.UserId, e.IsRead });
                entity.HasIndex(e => e.CreatedAt);
            });

        }
    }
}