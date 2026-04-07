using MediatR;
using Microsoft.AspNetCore.Mvc;
using Projet.Domain.Command.Sprint;
using Projet.Domain.Model;
using Projet.Domain.Querie;
using Projet.Domain.Querie.Sprint;
using Projet.Domain.Querie.User;
using Projet.Infrastructure.Service;
using System.Security.Claims;

namespace Projet.Api.Controller
{
    [Route("api/[controller]")]
    [ApiController]
    public class SprintController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly INotificationService _notificationService;

        public SprintController(IMediator mediator, INotificationService notificationService)
        {
            _mediator = mediator;
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var sprints = await _mediator.Send(new GetAllSprintQuery());
            return Ok(sprints);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var query = new GetSprintByIdQuery { Id = id };
                var sprint = await _mediator.Send(query);

                if (sprint == null)
                {
                    return NotFound(new { message = $"Sprint with ID {id} not found." });
                }

                return Ok(sprint);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Sprint with ID {id} not found." });
            }
        }

        [HttpGet("project/{projectId}")]
        public async Task<IActionResult> GetByProjectId(int projectId)
        {
            var query = new GetSprintByProjectIdQuery(projectId);
            var sprints = await _mediator.Send(query);
            return Ok(sprints);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSprintCommand command)
        {
            try
            {
                var sprintId = await _mediator.Send(command);

                try
                {
                    var project = await _mediator.Send(new GetProjectByIdQuery(command.ProjectId));
                    var users = await _mediator.Send(new GetAllUsersQuery());
                    var serviceManagerId = users.FirstOrDefault(u => u.role == UserRole.ServiceManager)?.Id;
                    var adminUserId = users.FirstOrDefault(u => u.role == UserRole.Admin)?.Id;
                    var creatorClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                    var createdByUserId = int.TryParse(creatorClaim, out var parsedCreatorId) ? parsedCreatorId : (int?)null;

                    await _notificationService.NotifySprintAddedAsync(
                        sprintId: sprintId,
                        projectManagerId: project.ProjectManagerId,
                        serviceManagerId: serviceManagerId,
                        adminUserId: adminUserId,
                        createdByUserId: createdByUserId);
                }
                catch
                {
                    // Notification failure should not block sprint creation.
                }

                return CreatedAtAction(nameof(GetById), new { id = sprintId }, new { message = "Sprint created", id = sprintId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateSprintCommand command)
        {
            try
            {
                command.id = id;
                await _mediator.Send(command);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Sprint with ID {id} not found." });
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
                var command = new DeleteSprintCommand(id);
                await _mediator.Send(command);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Sprint with ID {id} not found." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}