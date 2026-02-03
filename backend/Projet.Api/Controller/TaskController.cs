using MediatR;
using Microsoft.AspNetCore.Mvc;
using Projet.Domain.Command.TaskCRUD;
using Projet.Domain.Querie.Task;

namespace Projet.Api.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class TaskController : ControllerBase
    {
        private readonly IMediator _mediator;

        public TaskController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllTasksQuery();
            var tasks = await _mediator.Send(query);
            return Ok(tasks);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var query = new GetTaskById { id = id };
                var task = await _mediator.Send(query);
                return Ok(task);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Task with ID {id} not found." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTaskCommand command)
        {
            var taskId = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetById), new { id = taskId }, new { id = taskId });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTaskCommand command)
        {
            if (id != command.id)
            {
                return BadRequest(new { message = "ID in URL does not match ID in request body." });
            }

            try
            {
                await _mediator.Send(command);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Task with ID {id} not found." });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var command = new DeleteTaskCommand { id = id };
                await _mediator.Send(command);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Task with ID {id} not found." });
            }
        }
    }
}
