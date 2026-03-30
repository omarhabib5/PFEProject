using MediatR;
using System.Collections.Generic;

namespace Projet.Domain.Querie.Task
{
    public class GetAllTasksQuery : IRequest<List<Model.Task>>
    {
    }
}
