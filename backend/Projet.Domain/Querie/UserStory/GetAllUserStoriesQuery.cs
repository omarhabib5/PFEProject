using MediatR;
using UserStoryEntity = Projet.Domain.Model.UserStory;

namespace Projet.Domain.Querie.UserStory;

public class GetAllUserStoriesQuery : IRequest<List<UserStoryEntity>>
{
}
