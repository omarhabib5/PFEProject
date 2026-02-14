using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Application.DTOs.UserStory;
using Projet.Application.Querie.UserStory;
using Projet.Domain.Model;

namespace Projet.Application.Handler.UserStory;

public class GetUserStoryByIdHandler : IRequestHandler<GetUserStoryByIdQuery, UserStoryDetailDto>
{
    private readonly ApplicationDbContext _context;

    public GetUserStoryByIdHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserStoryDetailDto> Handle(GetUserStoryByIdQuery request, CancellationToken cancellationToken)
    {
        var userStory = await _context.UserStories
            .Include(us => us.AssignedTo)
            .Include(us => us.Tasks)
                .ThenInclude(t => t.AssignedTo)
            .FirstOrDefaultAsync(us => us.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"UserStory with Id {request.Id} not found");

        return new UserStoryDetailDto
        {
            Id = userStory.Id,
            Title = userStory.Title,
            Description = userStory.Description,
            AcceptanceCriteria = userStory.AcceptanceCriteria ?? string.Empty,
            StoryPoints = userStory.StoryPoints,
            Priority = userStory.Priority,
            Status = userStory.Status,
            SprintId = userStory.SprintId,
            AssignedToId = userStory.AssignedToId,
            AssignedToName = userStory.AssignedTo != null
                ? $"{userStory.AssignedTo.FirstName} {userStory.AssignedTo.LastName}"
                : null,
            CreatedAt = userStory.CreatedAt,
            UpdatedAt = userStory.UpdatedAt,
            TaskCount = userStory.Tasks.Count,
            CompletedTaskCount = userStory.Tasks.Count(t => t.Status == State.done),
            Tasks = userStory.Tasks.Select(t => new TaskDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status,
                EstimatedHours = t.EstimatedHours,
                ActualHours = t.ActualHours,
                UserStoryId = t.UserStoryId,
                AssignedToId = t.AssignedToId,
                AssignedToName = t.AssignedTo != null
                    ? $"{t.AssignedTo.FirstName} {t.AssignedTo.LastName}"
                    : null,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            }).ToList()
        };
    }
}
