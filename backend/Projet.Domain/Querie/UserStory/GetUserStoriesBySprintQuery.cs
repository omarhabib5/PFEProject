using MediatR;
using UserStoryEntity = Projet.Domain.Model.UserStory;

namespace Projet.Domain.Querie.UserStory;

public class GetUserStoriesBySprintQuery : IRequest<List<UserStoryEntity>>
{
    public int SprintId { get; set; }
}
