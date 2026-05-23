using System;
using MediatR;
using Microsoft.EntityFrameworkCore;
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

        var normalizedTitle = request.Title?.Trim();
        var targetTitle = normalizedTitle ?? userStory.Title?.Trim();
        var targetSprintId = userStory.SprintId;
        var targetProjectId = userStory.ProjectId;

        if (request.SprintId.HasValue)
        {
            var targetSprint = await _context.Sprints.FindAsync(new object[] { request.SprintId.Value }, cancellationToken)
                ?? throw new KeyNotFoundException($"Sprint with Id {request.SprintId.Value} not found");

            targetSprintId = targetSprint.Id;
            targetProjectId = targetSprint.ProjectId;
        }

        if (!string.IsNullOrWhiteSpace(targetTitle))
        {
            var duplicateUserStoryExists = await _context.UserStories.AnyAsync(us =>
                us.Id != userStory.Id
                && us.ProjectId == targetProjectId
                && us.Title != null
                && us.Title == targetTitle, cancellationToken);

            if (duplicateUserStoryExists)
            {
                throw new InvalidOperationException("A user story with this name already exists.");
            }
        }

        if (request.Title != null)
        {
            if (string.IsNullOrWhiteSpace(normalizedTitle))
            {
                throw new ArgumentException("Title is required");
            }

            userStory.Title = normalizedTitle;
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

        if (request.SprintId.HasValue)
        {
            userStory.SprintId = targetSprintId;
            userStory.ProjectId = targetProjectId;
        }

        if (request.Status.HasValue)
        {
            userStory.Status = request.Status.Value;
        }

        if (request.EstimatedDuration.HasValue)
        {
            userStory.EstimatedDuration = request.EstimatedDuration.Value;
        }

        userStory.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
