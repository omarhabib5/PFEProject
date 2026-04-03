using System;
using MediatR;
using Microsoft.EntityFrameworkCore;

using Projet.Domain.Command.UserStory;
using Projet.Domain.Model;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.UserStory;

public class CreateUserStoryHandler : IRequestHandler<CreateUserStoryCommand, int>
{
    private readonly IApplicationDbSet _context;

    public CreateUserStoryHandler(IApplicationDbSet context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateUserStoryCommand request, CancellationToken cancellationToken)
    {
        var sprint = await _context.Sprints.FindAsync(new object[] { request.SprintId }, cancellationToken)
            ?? throw new KeyNotFoundException($"Sprint with Id {request.SprintId} not found");

        if (request.AssignedToId.HasValue)
        {
            _ = await _context.Users.FindAsync(new object[] { request.AssignedToId.Value }, cancellationToken)
                ?? throw new KeyNotFoundException($"User with Id {request.AssignedToId.Value} not found");
        }

        var userStory = new Domain.Model.UserStory
        {
            Title = request.Title,
            Description = request.Description,
            AcceptanceCriteria = request.AcceptanceCriteria,
            StoryPoints = request.StoryPoints,
            Priority = request.Priority,
            SprintId = request.SprintId,
            ProjectId = sprint.ProjectId,
            AssignedToId = request.AssignedToId,
            CreatedById = request.CreatedById,
        
            Status = State.todo
        };

        _context.UserStories.Add(userStory);
        await _context.SaveChangesAsync(cancellationToken);

        return userStory.Id;
    }
}
