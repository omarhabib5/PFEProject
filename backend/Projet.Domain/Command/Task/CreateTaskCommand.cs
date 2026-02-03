

using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Command.TaskCRUD
{
    public class CreateTaskCommand : IRequest<int>
    {
        public string Name { get; set; }
        public string description { get; set; }
        public int EstimationDuration { get; set; }
        public DateTime StartDate { get; set; } = DateTime.Now;
        public DateTime EndDate { get; set; }
        public State taskState { get; set; }
        public int complexity { get; set; }
        public int UserStoryId { get; set; }
    }
}
