using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Command
{
    public class UpdateProjectCommand : IRequest<Unit>
    {
        public Guid id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; }

        public UpdateProjectCommand(Guid id, string name, string description, DateTime startDate, DateTime endDate, string status)
        {
            this.id = id;
            Name = name;
            Description = description;
            StartDate = startDate;
            EndDate = endDate;
            Status = status;
        }
    }
}
