using MediatR;
using Microsoft.AspNetCore.Mvc;
using Projet.Domain.Command.Notification;
using Projet.Domain.Model;
using Projet.Domain.Querie.Notification;
using Projet.Infrastructure.Service;
using System.Security.Claims;
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
        private readonly INotificationService _notificationService;

        public NotificationController(IMediator mediator, INotificationService notificationService)
        {
            _mediator = mediator;
            _notificationService = notificationService;
        }

        public class SendDirectMessageRequest
        {
            public int RecipientUserId { get; set; }
            public string Message { get; set; } = string.Empty;
            public int? TaskId { get; set; }
            public string? Title { get; set; }
            public string? AttachmentName { get; set; }
            public string? AttachmentDataUrl { get; set; }
        }

        private bool TryResolveAuthenticatedUserId(out int userId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (int.TryParse(userIdClaim, out userId) && userId > 0)
            {
                return true;
            }

            if (HttpContext.Items.TryGetValue("UserId", out var rawUserId)
                && rawUserId != null
                && int.TryParse(rawUserId.ToString(), out userId)
                && userId > 0)
            {
                return true;
            }

            userId = 0;
            return false;
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

        [HttpGet("conversation/{otherUserId}")]
        public async Task<IActionResult> GetConversation(int otherUserId)
        {
            try
            {
                if (otherUserId <= 0)
                {
                    return BadRequest(new { message = "Other user is required." });
                }

                if (!TryResolveAuthenticatedUserId(out int currentUserId))
                {
                    return Unauthorized(new { message = "User ID not found in token" });
                }

                var items = await _notificationService.GetConversationAsync(currentUserId, otherUserId);
                return Ok(items);
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
                if (!TryResolveAuthenticatedUserId(out int userId))
                {
                    return Unauthorized(new { message = "User ID not found in token" });
                }

                var command = new MarkAsReadCommand(id, userId);
                await _mediator.Send(command);
                await _notificationService.PublishUserNotificationsAsync(userId);
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
                if (!TryResolveAuthenticatedUserId(out int userId))
                {
                    return Unauthorized(new { message = "User ID not found in token" });
                }

                var command = new DeleteNotificationCommand(id, userId);
                await _mediator.Send(command);
                await _notificationService.PublishUserNotificationsAsync(userId);
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

        [HttpPost("direct-message")]
        public async Task<IActionResult> SendDirectMessage([FromBody] SendDirectMessageRequest request)
        {
            try
            {
                if (request == null || request.RecipientUserId <= 0)
                {
                    return BadRequest(new { message = "Recipient user is required." });
                }

                var hasMessage = !string.IsNullOrWhiteSpace(request.Message);
                var hasAttachment = !string.IsNullOrWhiteSpace(request.AttachmentDataUrl);

                if (!hasMessage && !hasAttachment)
                {
                    return BadRequest(new { message = "Message or attachment is required." });
                }

                if (!TryResolveAuthenticatedUserId(out int senderUserId))
                {
                    return Unauthorized(new { message = "User ID not found in token" });
                }

                var title = string.IsNullOrWhiteSpace(request.Title) ? "Nouveau message" : request.Title.Trim();
                var notification = await _notificationService.CreateNotificationAsync(
                    userId: request.RecipientUserId,
                    title: title,
                    message: hasMessage ? request.Message.Trim() : "Piece jointe",
                    type: NotificationType.Info,
                    category: NotificationCategory.TaskUpdate,
                    link: hasAttachment ? null : (request.TaskId.HasValue ? $"/tasks/{request.TaskId.Value}" : null),
                    relatedTaskId: request.TaskId,
                    relatedUserId: senderUserId,
                    oldValue: hasAttachment ? request.AttachmentName : null,
                    newValue: hasAttachment ? request.AttachmentDataUrl : null
                );

                return Ok(notification);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}