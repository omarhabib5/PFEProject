using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.UserStory;
using Projet.Domain.Interface;
using Projet.Domain.Model;


namespace Projet.Domain.Handler.UserStory;

public class DeleteUserStoryHandler : IRequestHandler<DeleteUserStoryCommand, Unit>
{
    private readonly IApplicationDbSet _context;

    public DeleteUserStoryHandler(IApplicationDbSet context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(DeleteUserStoryCommand request, CancellationToken cancellationToken)
    {
        var userStory = await _context.UserStories
            .Include(x => x.Tasks)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (userStory == null)
        {
            throw new KeyNotFoundException($"User Story with id {request.Id} not found");
        }

        _context.Tasks.RemoveRange(userStory.Tasks);
        _context.UserStories.Remove(userStory);
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
