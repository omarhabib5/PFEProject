using MediatR;
using Microsoft.AspNetCore.Mvc;
using Projet.Domain.Command.UserStory;
using Projet.Domain.Querie.UserStory;

namespace Projet.Api.Controller
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserStoryController : ControllerBase
    {
        private readonly IMediator _mediator;

        public UserStoryController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userStories = await _mediator.Send(new GetAllUserStoryQuery());
            return Ok(userStories);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var query = new GetUserStoryByIdQuery { Id = id };
                var userStory = await _mediator.Send(query);

                if (userStory == null)
                {
                    return NotFound(new { message = $"UserStory with ID {id} not found." });
                }

                return Ok(userStory);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"UserStory with ID {id} not found." });
            }
        }

        [HttpGet("sprint/{sprintId}")]
        public async Task<IActionResult> GetBySprintId(int sprintId)
        {
            var query = new GetUserStoryBySprintIdQuery(sprintId);
            var userStories = await _mediator.Send(query);
            return Ok(userStories);
        }

        [HttpGet("project/{projectId}")]
        public async Task<IActionResult> GetByProjectId(int projectId)
        {
            var query = new GetUserStoryByProjectIdQuery(projectId);
            var userStories = await _mediator.Send(query);
            return Ok(userStories);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUserStoryCommand command)
        {
            try
            {
                var userStoryId = await _mediator.Send(command);
                return CreatedAtAction(nameof(GetById), new { id = userStoryId }, new { message = "UserStory created", id = userStoryId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserStoryCommand command)
        {
            try
            {
                command.Id = id;
                await _mediator.Send(command);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"UserStory with ID {id} not found." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var command = new DeleteUserStoryCommand(id);
                await _mediator.Send(command);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"UserStory with ID {id} not found." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
