using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Command.TaskCRUD
{
    public class UpdateTaskCommand : IRequest<Unit>
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int EstimatedHours { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public State Status { get; set; }
        public int Complexity { get; set; }
        public int UserStoryId { get; set; }
        public int? AssignedToId { get; set; }
        public int? SprintId { get; set; }
    }
}
