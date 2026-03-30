using MediatR;

namespace Projet.Domain.Command.UserStory;

public class DeleteUserStoryCommand : IRequest<Unit>
{
    public int Id { get; set; }
}
