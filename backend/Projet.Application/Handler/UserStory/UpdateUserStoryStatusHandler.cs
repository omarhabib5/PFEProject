using System;
using MediatR;
using Projet.Application.Context;
using Projet.Domain.Command.UserStory;

namespace Projet.Application.Handler.UserStory;

public class UpdateUserStoryStatusHandler : IRequestHandler<UpdateUserStoryStatusCommand, Unit>
{
    private readonly ApplicationDbContext _context;

    public UpdateUserStoryStatusHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(UpdateUserStoryStatusCommand request, CancellationToken cancellationToken)
    {
        var userStory = await _context.UserStories.FindAsync(new object[] { request.Id }, cancellationToken);
        if (userStory == null)
        {
            throw new KeyNotFoundException($"UserStory with ID {request.Id} not found");
        }

        userStory.Status = request.NewStatus;
        userStory.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
