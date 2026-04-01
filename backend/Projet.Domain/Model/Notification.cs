using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Model
{
    public enum NotificationType
    {
        Info = 0,
        Success = 1,
        Warning = 2,
        Alert = 3,
        TaskStatusChanged = 4,
        UserStoryAdded = 5,
        ProjectAdded = 6,
        UserRoleChanged = 7,
        TaskDeadlineApproaching = 8,
        TaskOverdue = 9,
        TicketStatusChanged = 10
    }

    public enum NotificationCategory
    {
        General,
        TaskUpdate,
        ProjectUpdate,
        UserUpdate,
        UserStoryUpdate,
        Deadline
    }

    public class Notification
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public NotificationType Type { get; set; } = NotificationType.Info;
        public NotificationCategory Category { get; set; } = NotificationCategory.General;
        public bool IsRead { get; set; } = false;
        public bool EmailSent { get; set; } = false;
        public DateTime? EmailSentAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReadAt { get; set; }
        public string? Link { get; set; }
        
        
        public int? RelatedTaskId { get; set; }
        public int? RelatedProjectId { get; set; }
        public int? RelatedUserStoryId { get; set; }
        public int? RelatedUserId { get; set; }
        public string? OldValue { get; set; } 
        public string? NewValue { get; set; } 
        
        public int UserId { get; set; }
        public virtual User? User { get; set; }
    }
}