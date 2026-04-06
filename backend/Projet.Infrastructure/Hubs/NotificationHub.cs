using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Projet.Infrastructure.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        private static string UserGroup(int userId) => $"user:{userId}";

        public override async Task OnConnectedAsync()
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? Context.User?.FindFirst("sub")?.Value;

            if (int.TryParse(userIdClaim, out var userId) && userId > 0)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId));
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? Context.User?.FindFirst("sub")?.Value;

            if (int.TryParse(userIdClaim, out var userId) && userId > 0)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, UserGroup(userId));
            }

            await base.OnDisconnectedAsync(exception);
        }

        public static string GetUserGroup(int userId) => UserGroup(userId);
    }
}
