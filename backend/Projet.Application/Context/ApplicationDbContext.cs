using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
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

        public DbSet<ProjectModel> Projects { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ProjectModel>(entity =>
            {
                entity.HasKey(e => e.id);
                entity.Property(e => e.name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.description).HasMaxLength(1000);
                entity.Property(e => e.status).HasMaxLength(50);
                entity.Property(e => e.createdBy).HasMaxLength(100);
            });
        }
    }
}
