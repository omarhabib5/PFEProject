using System;
using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Command
{
    public class UpdateProjectCommand : IRequest<Unit>
    {
        public int id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int EstimatedDuration { get; set; }
        public State ProjectState { get; set; }
        public int? ServiceId { get; set; }
        public int? TeamId { get; set; }
        public int ProjectManagerId { get; set; }
    }
}
