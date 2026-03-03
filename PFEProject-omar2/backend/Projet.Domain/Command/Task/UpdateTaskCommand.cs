using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Command.TaskCRUD
{
    public class UpdateTaskCommand : IRequest<Unit>
    {
        public int id { get; set; }
        public string Name { get; set; }
        public string description { get; set; }
        public int EstimationDuration { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public State taskState { get; set; }
        public int complexity { get; set; }
        public int UserStoryId { get; set; }
        public int? AssignedToId { get; set; }
    }
}
