using MediatR;
using Projet.Application.DTOs.UserStory;

namespace Projet.Application.Querie.UserStory;

public class GetUserStoryByIdQuery : IRequest<UserStoryDetailDto>
{
    public int Id { get; set; }
}
