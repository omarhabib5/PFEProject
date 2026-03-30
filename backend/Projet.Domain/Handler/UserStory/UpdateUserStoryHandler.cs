using System;
using MediatR;
using Projet.Domain.Command.UserStory;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.UserStory;

public class UpdateUserStoryHandler : IRequestHandler<UpdateUserStoryCommand, Unit>
{
    private readonly IApplicationDbSet _context;

    public UpdateUserStoryHandler(IApplicationDbSet context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(UpdateUserStoryCommand request, CancellationToken cancellationToken)
    {
        var userStory = await _context.UserStories.FindAsync(new object[] { request.Id }, cancellationToken);
        if (userStory == null)
        {
            throw new KeyNotFoundException($"UserStory with Id {request.Id} not found");
        }

        if (request.Title != null)
        {
            userStory.Title = request.Title;
        }

        if (request.Description != null)
        {
            userStory.Description = request.Description;
        }

        if (request.AcceptanceCriteria != null)
        {
            userStory.AcceptanceCriteria = request.AcceptanceCriteria;
        }

        if (request.StoryPoints.HasValue)
        {
            userStory.StoryPoints = request.StoryPoints.Value;
        }

        if (request.Priority.HasValue)
        {
            userStory.Priority = request.Priority.Value;
        }

        if (request.AssignedToId.HasValue)
        {
            userStory.AssignedToId = request.AssignedToId.Value;
        }

        userStory.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
