using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Application.DTOs.UserStory;
using Projet.Application.Querie.UserStory;
using Projet.Domain.Model;

namespace Projet.Application.Handler.UserStory;

public class GetUserStoriesBySprintHandler : IRequestHandler<GetUserStoriesBySprintQuery, List<UserStoryDto>>
{
    private readonly ApplicationDbContext _context;

    public GetUserStoriesBySprintHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<UserStoryDto>> Handle(GetUserStoriesBySprintQuery request, CancellationToken cancellationToken)
    {
        return await _context.UserStories
            .Where(us => us.SprintId == request.SprintId)
            .Include(us => us.AssignedTo)
            .Include(us => us.Tasks)
            .Select(us => new UserStoryDto
            {
                Id = us.Id,
                Title = us.Title,
                Description = us.Description,
                AcceptanceCriteria = us.AcceptanceCriteria,
                StoryPoints = us.StoryPoints,
                Priority = us.Priority,
                Status = us.Status,
                SprintId = us.SprintId,
                AssignedToId = us.AssignedToId,
                AssignedToName = us.AssignedTo != null
                    ? $"{us.AssignedTo.FirstName} {us.AssignedTo.LastName}"
                    : null,
                TaskCount = us.Tasks.Count,
                CompletedTaskCount = us.Tasks.Count(t => t.Status == State.done),
                CreatedAt = us.CreatedAt,
                UpdatedAt = us.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }
}
