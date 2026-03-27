using MediatR;
using Microsoft.AspNetCore.Mvc;
using Projet.Domain.Command.Notification;
using Projet.Domain.Querie.Notification;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Projet.Api.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationController : ControllerBase
    {
        private readonly IMediator _mediator;

        public NotificationController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserNotifications(int userId)
        {
            try
            {
                var query = new GetNotificationsQuery(userId);
                var notifications = await _mediator.Send(query);
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("user/{userId}/unread")]
        public async Task<IActionResult> GetUnreadNotifications(int userId)
        {
            try
            {
                var query = new GetNotificationsQuery(userId, isRead: false);
                var notifications = await _mediator.Send(query);
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("{id}/mark-as-read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                var userIdClaim = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value
                    ?? User.FindFirst("sub")?.Value;

                if (!int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "User ID not found in token" });
                }

                var command = new MarkAsReadCommand(id, userId);
                await _mediator.Send(command);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Notification with ID {id} not found." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            try
            {
                var userIdClaim = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value
                    ?? User.FindFirst("sub")?.Value;

                if (!int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "User ID not found in token" });
                }

                var command = new DeleteNotificationCommand(id, userId);
                await _mediator.Send(command);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Notification with ID {id} not found." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
