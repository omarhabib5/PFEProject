using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Querie
{
    public class GetProjectByIdQuery : IRequest<ProjectModel>
    {
        public Guid Id { get; set; }

        public GetProjectByIdQuery(Guid id)
        {
            Id = id;
        }
    }

    public class GetAllProjectsQuery : IRequest<List<ProjectModel>>
    {
    }
}
