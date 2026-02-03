using MediatR;
using Microsoft.AspNetCore.Mvc;
using Projet.Domain.Command.Team;
using Projet.Domain.Querie.Team;

namespace Projet.Api.Controller
{
    [Route("api/[controller]")]
    [ApiController]
    public class TeamController : ControllerBase
    {
        private readonly IMediator _mediator;

        public TeamController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var teams = await _mediator.Send(new GetAllTeamQuery());
            return Ok(teams);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var team = await _mediator.Send(new GetTeamById { id = id });
                return Ok(team);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTeamCommand command)
        {
            var teamId = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetById), new { id = teamId }, new { id = teamId });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTeamCommand command)
        {
            if (id != command.id)
            {
                return BadRequest(new { message = "Id mismatch" });
            }

            try
            {
                await _mediator.Send(command);
                return NoContent();
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _mediator.Send(new DeleteTeamCommand { id = id });
                return NoContent();
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
