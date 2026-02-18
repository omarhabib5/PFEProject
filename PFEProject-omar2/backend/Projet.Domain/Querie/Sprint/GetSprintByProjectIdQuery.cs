using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;

namespace Projet.Domain.Querie.Sprint
{
 public class GetSprintByProjectIdQuery: IRequest<List<Model.Sprint>>
    {
         public int ProjectId { get; set; }
         public GetSprintByProjectIdQuery(int projectId)
         {
             ProjectId = projectId;
        }
    
    }
}
