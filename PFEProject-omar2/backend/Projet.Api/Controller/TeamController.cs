using MediatR;
using Microsoft.AspNetCore.Mvc;
using Projet.Domain.Command.Team;
using Projet.Domain.Command.TeamUser;
using Projet.Domain.Querie.Team;
using Projet.Domain.Querie.TeamUser;

namespace Projet.Api.Controller
{
    [Route("api/teams")]
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
            try
            {
                var teamId = await _mediator.Send(command);
                return CreatedAtAction(nameof(GetById), new { id = teamId }, new { id = teamId });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
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
            catch (KeyNotFoundException ex)
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
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

    

        [HttpGet("{teamId}/members")]
        public async Task<IActionResult> GetMembers(int teamId)
        {
            var members = await _mediator.Send(new GetTeamUserByTeamIdQuery { TeamId = teamId });
            return Ok(members);
        }

       
        [HttpGet("{teamId}/members/leaders")]
        public async Task<IActionResult> GetLeaders(int teamId)
        {
            var leaders = await _mediator.Send(new GetProjectLeaderQuery { TeamId = teamId });
            return Ok(leaders);
        }

     
        [HttpGet("{teamId}/members/employees")]
        public async Task<IActionResult> GetEmployees(int teamId)
        {
            var employees = await _mediator.Send(new GetEmployeeQuery { TeamId = teamId });
            return Ok(employees);
        }

     
        [HttpPost("{teamId}/members")]
        public async Task<IActionResult> AddMember(int teamId, [FromBody] CreateTeamUserCommand command)
        {
            
            command.TeamId = teamId;

            try
            {
                var memberId = await _mediator.Send(command);
                return CreatedAtAction(nameof(GetMembers), new { teamId }, new { id = memberId });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        
        [HttpPut("{teamId}/members/{memberId}/role")]
        public async Task<IActionResult> UpdateMemberRole(int teamId, int memberId, [FromBody] UpdateTeamUserCommand command)
        {
          
            command.Id = memberId;

            try
            {
                await _mediator.Send(command);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{teamId}/members/{memberId}")]
        public async Task<IActionResult> RemoveMember(int teamId, int memberId)
        {
            try
            {
                await _mediator.Send(new DeleteTeamUserCommand(memberId));
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

    
    }
}
