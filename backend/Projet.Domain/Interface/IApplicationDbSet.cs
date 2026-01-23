using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Model;

namespace Projet.Domain.Interface
{
    public interface IApplicationDbSet
    {
        DbSet<ProjectModel> Projects { get; }
        Task<int> SaveChangesAsync(CancellationToken cancellationToken);
    }
}
