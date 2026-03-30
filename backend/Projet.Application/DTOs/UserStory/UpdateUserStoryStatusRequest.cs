using Projet.Domain.Model;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Application.DTOs.UserStory
{
    public class UpdateUserStoryStatusRequest
    {
        public State Status { get; set; }
    }
}
