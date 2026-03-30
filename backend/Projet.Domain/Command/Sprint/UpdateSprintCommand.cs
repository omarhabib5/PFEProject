using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Command.Sprint
{
    public class UpdateSprintCommand : IRequest<Unit>
    {
        public int id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int EstimatedDuration { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int ProjectId { get; set; }
        public State SprintState { get; set; }
    }
}