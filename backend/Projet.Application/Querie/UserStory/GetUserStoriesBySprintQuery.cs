using MediatR;
using Projet.Application.DTOs.UserStory;

namespace Projet.Application.Querie.UserStory;

public class GetUserStoriesBySprintQuery : IRequest<List<UserStoryDto>>
{
    public int SprintId { get; set; }
}
