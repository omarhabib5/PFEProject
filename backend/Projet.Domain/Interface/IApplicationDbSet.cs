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
      
        Task<int> SaveChangesAsync(CancellationToken cancellationToken);
    }
}
