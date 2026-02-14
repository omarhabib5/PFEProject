using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.UserStory;

namespace Projet.Application.Handler.UserStory;

public class DeleteUserStoryHandler : IRequestHandler<DeleteUserStoryCommand, Unit>
{
    private readonly ApplicationDbContext _context;

    public DeleteUserStoryHandler(ApplicationDbContext context)
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
