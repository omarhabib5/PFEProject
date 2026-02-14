using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Projet.Application.DTOs.UserStory;
using Projet.Application.Querie.UserStory;
using Projet.Domain.Command.UserStory;
using System.Security.Claims;

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

    [HttpGet("sprint/{sprintId:int}")]
    public async Task<ActionResult<List<UserStoryDto>>> GetBySprintId(int sprintId)
    {
        var query = new GetUserStoriesBySprintQuery { SprintId = sprintId };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserStoryDetailDto>> GetById(int id)
    {
        var query = new GetUserStoryByIdQuery { Id = id };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<int>> Create([FromBody] CreateUserStoryRequest request)
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
            CreatedById = GetCurrentUserId()
        };

        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetById), new { id = result }, result);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult> Update(int id, [FromBody] UpdateUserStoryRequest request)
    {
        var command = new UpdateUserStoryCommand
        {
            Id = id,
            Title = request.Title,
            Description = request.Description,
            AcceptanceCriteria = request.AcceptanceCriteria,
            StoryPoints = request.StoryPoints,
            Priority = request.Priority,
            AssignedToId = request.AssignedToId
        };

        await _mediator.Send(command);
        return NoContent();
    }

    [HttpPatch("{id:int}/status")]
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
    public async Task<ActionResult> Delete(int id)
    {
        var command = new DeleteUserStoryCommand { Id = id };
        await _mediator.Send(command);
        return NoContent();
    }
}
