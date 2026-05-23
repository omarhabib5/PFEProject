using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Projet.Domain.Command.UserStory;
using Projet.Domain.Querie.UserStory;
using System.Security.Claims;
using CreateUserStoryRequest = Projet.Application.DTOs.UserStory.CreateUserStoryRequest;
using UserStoryDto = Projet.Application.DTOs.UserStory.UserStoryDto;
using UserStoryDetailDto = Projet.Application.DTOs.UserStory.UserStoryDetailDto;
using UserStoryTaskDto = Projet.Application.DTOs.UserStory.TaskDto;
using UpdateUserStoryRequest = Projet.Application.DTOs.UserStory.UpdateUserStoryRequest;
using UpdateUserStoryStatusRequest = Projet.Application.DTOs.UserStory.UpdateUserStoryStatusRequest;

namespace Projet.Api.Controller;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserStoryController : ControllerBase
{
    private readonly IMediator _mediator;

    public UserStoryController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim!);
    }

    [HttpGet]
    public async Task<ActionResult<List<UserStoryDto>>> GetAll()
    {
        var query = new GetAllUserStoriesQuery();
        var result = await _mediator.Send(query);

        var mapped = result.Select(x => new UserStoryDto
        {
            Id = x.Id,
            Title = x.Title,
            Description = x.Description,
            AcceptanceCriteria = x.AcceptanceCriteria,
            StoryPoints = x.StoryPoints,
            Priority = x.Priority,
            Status = x.Status,
            SprintId = x.SprintId,
            ProjectId = x.ProjectId,
            AssignedToId = x.AssignedToId,
            AssignedToName = x.AssignedTo != null
                ? $"{x.AssignedTo.FirstName} {x.AssignedTo.LastName}"
                : null,
            TaskCount = x.Tasks.Count,
            CompletedTaskCount = x.Tasks.Count(t => t.Status == Projet.Domain.Model.State.done),
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt
        }).ToList();

        return Ok(mapped);
    }

    [HttpGet("sprint/{sprintId:int}")]
    public async Task<ActionResult<List<UserStoryDto>>> GetBySprintId(int sprintId)
    {
        var query = new GetUserStoriesBySprintQuery { SprintId = sprintId };
        var result = await _mediator.Send(query);

        var mapped = result.Select(x => new UserStoryDto
        {
            Id = x.Id,
            Title = x.Title,
            Description = x.Description,
            AcceptanceCriteria = x.AcceptanceCriteria,
            StoryPoints = x.StoryPoints,
            Priority = x.Priority,
            Status = x.Status,
            SprintId = x.SprintId,
            ProjectId = x.ProjectId,
            AssignedToId = x.AssignedToId,
            AssignedToName = x.AssignedTo != null
                ? $"{x.AssignedTo.FirstName} {x.AssignedTo.LastName}"
                : null,
            TaskCount = x.Tasks.Count,
            CompletedTaskCount = x.Tasks.Count(t => t.Status == Projet.Domain.Model.State.done),
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt
        }).ToList();

        return Ok(mapped);
    }

    [HttpGet("project/{projectId:int}")]
    public async Task<ActionResult<List<UserStoryDto>>> GetByProjectId(int projectId)
    {
        var query = new GetUserStoriesByProjectQuery { ProjectId = projectId };
        var result = await _mediator.Send(query);

        var mapped = result.Select(x => new UserStoryDto
        {
            Id = x.Id,
            Title = x.Title,
            Description = x.Description,
            AcceptanceCriteria = x.AcceptanceCriteria,
            StoryPoints = x.StoryPoints,
            Priority = x.Priority,
            Status = x.Status,
            SprintId = x.SprintId,
            ProjectId = x.ProjectId,
            AssignedToId = x.AssignedToId,
            AssignedToName = x.AssignedTo != null
                ? $"{x.AssignedTo.FirstName} {x.AssignedTo.LastName}"
                : null,
            TaskCount = x.Tasks.Count,
            CompletedTaskCount = x.Tasks.Count(t => t.Status == Projet.Domain.Model.State.done),
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt
        }).ToList();

        return Ok(mapped);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserStoryDetailDto>> GetById(int id)
    {
        var query = new GetUserStoryByIdQuery { Id = id };
        var result = await _mediator.Send(query);

        var mapped = new UserStoryDetailDto
        {
            Id = result.Id,
            Title = result.Title,
            Description = result.Description,
            AcceptanceCriteria = result.AcceptanceCriteria ?? string.Empty,
            StoryPoints = result.StoryPoints,
            Priority = result.Priority,
            Status = result.Status,
            SprintId = result.SprintId,
            ProjectId = result.ProjectId,
            AssignedToId = result.AssignedToId,
            AssignedToName = result.AssignedTo != null
                ? $"{result.AssignedTo.FirstName} {result.AssignedTo.LastName}"
                : null,
            CreatedAt = result.CreatedAt,
            UpdatedAt = result.UpdatedAt,
            TaskCount = result.Tasks.Count,
            CompletedTaskCount = result.Tasks.Count(t => t.Status == Projet.Domain.Model.State.done),
            Tasks = result.Tasks.Select(t => new UserStoryTaskDto
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

        return Ok(mapped);
    }

    [HttpPost]
    [Authorize(Roles = "ProjectManager")]
    public async Task<ActionResult<int>> Create([FromBody] CreateUserStoryRequest request)
    {
        try
        {
            var command = new CreateUserStoryCommand
            {
                Title = request.Title,
                Description = request.Description,
                AcceptanceCriteria = request.AcceptanceCriteria,
                StoryPoints = request.StoryPoints,
                Priority = request.Priority,
                SprintId = request.SprintId,
                AssignedToId = request.AssignedToId,
                Status = request.Status,
                EstimatedDuration = request.EstimatedDuration,
                CreatedById = GetCurrentUserId()
            };

            var result = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetById), new { id = result }, result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "ProjectManager")]
    public async Task<ActionResult> Update(int id, [FromBody] UpdateUserStoryRequest request)
    {
        try
        {
            var command = new UpdateUserStoryCommand
            {
                Id = id,
                Title = request.Title,
                Description = request.Description,
                AcceptanceCriteria = request.AcceptanceCriteria,
                StoryPoints = request.StoryPoints,
                Priority = request.Priority,
                AssignedToId = request.AssignedToId,
                SprintId = request.SprintId,
                Status = request.Status,
                EstimatedDuration = request.EstimatedDuration
            };

            await _mediator.Send(command);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "ProjectManager")]
    public async Task<ActionResult> UpdateStatus(int id, [FromBody] UpdateUserStoryStatusRequest request)
    {
        var command = new UpdateUserStoryStatusCommand
        {
            Id = id,
            NewStatus = request.Status
        };

        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "ProjectManager")]
    public async Task<ActionResult> Delete(int id)
    {
        var command = new DeleteUserStoryCommand { Id = id };
        await _mediator.Send(command);
        return NoContent();
    }
}
