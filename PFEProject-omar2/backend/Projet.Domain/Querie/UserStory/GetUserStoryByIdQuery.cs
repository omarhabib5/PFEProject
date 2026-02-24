using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Querie.UserStory
{
    public class GetUserStoryByIdQuery : IRequest<Model.UserStory>
    {
        public int Id { get; set; }
    }
}
