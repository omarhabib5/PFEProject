using MediatR;
using Projet.Domain.Model;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Command.UserStory
{
    public class UpdateUserStoryStatusCommand : IRequest<Unit>
    {
        public int Id { get; set; }
        public State NewStatus { get; set; }
    }
}
