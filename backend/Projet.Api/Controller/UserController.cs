using MediatR;
using Microsoft.AspNetCore.Mvc;
using Projet.Domain.Command.User;
using Projet.Domain.Querie.User;
using Projet.Infrastructure.Service;
using System.Security.Claims;

namespace Projet.Api.Controller
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly INotificationService _notificationService;

        public UserController(IMediator mediator, INotificationService notificationService)
        {
            _mediator = mediator;
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _mediator.Send(new GetAllUsersQuery());
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _mediator.Send(new GetUserByIdQuery(id));
            
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(user);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUserCommand command)
        {
            try
            {
                var user = await _mediator.Send(command);
                return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserCommand command)
        {
            if (id != command.Id)
            {
                return BadRequest(new { message = "Id mismatch" });
            }

            try
            {
                var existingUser = await _mediator.Send(new GetUserByIdQuery(id));
                var oldRole = existingUser?.role;

                var user = await _mediator.Send(command);
                
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                if (oldRole.HasValue && oldRole.Value != user.role)
                {
                    var actorClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                        ?? User.FindFirst("sub")?.Value;
                    var changedByUserId = int.TryParse(actorClaim, out var parsedUserId)
                        ? parsedUserId
                        : user.Id;

                    try
                    {
                        await _notificationService.NotifyUserRoleChangedAsync(
                            changedUserId: user.Id,
                            changedByUserId: changedByUserId,
                            oldRole: oldRole.Value.ToString(),
                            newRole: user.role.ToString());
                    }
                    catch
                    {
                        
                    }
                }

                return Ok(user);
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
                var result = await _mediator.Send(new DeleteUserCommand(id));
                
                if (!result)
                {
                    return NotFound(new { message = "User not found" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
