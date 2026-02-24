using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Command.UserStory
{
    public class DeleteUserStoryCommand : IRequest<Unit>
    {
        public int Id { get; set; }

        public DeleteUserStoryCommand(int id)
        {
            Id = id;
        }
    }
}
