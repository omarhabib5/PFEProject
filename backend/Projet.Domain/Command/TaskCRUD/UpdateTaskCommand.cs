using MediatR;
using Projet.Domain.Model;

namespace Projet.Domain.Command.TaskCRUD
{
    public class UpdateTaskCommand : IRequest<Unit>
    {
        public int id { get; set; }
        public string title { get; set; }
        public string description { get; set; }
        public Model.TaskStatus statue { get; set; }
        public PriorityLevel Priority { get; set; }
        public int EstimationHours { get; set; }
        public int ticketID { get; set; }
        public int AssingnedToUserID { get; set; }
    }
}
