using MediatR;
using UserStoryEntity = Projet.Domain.Model.UserStory;

namespace Projet.Domain.Querie.UserStory;

public class GetUserStoryByIdQuery : IRequest<UserStoryEntity>
{
    public int Id { get; set; }
}
