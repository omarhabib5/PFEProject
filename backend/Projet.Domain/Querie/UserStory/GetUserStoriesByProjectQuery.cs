using MediatR;
using UserStoryEntity = Projet.Domain.Model.UserStory;

namespace Projet.Domain.Querie.UserStory;

public class GetUserStoriesByProjectQuery : IRequest<List<UserStoryEntity>>
{
    public int ProjectId { get; set; }
}
