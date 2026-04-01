using System;
using Projet.Domain.Model;

namespace Projet.Domain.Events
{
    
    
    
    public abstract class DomainEvent
    {
        public DateTime OccurredOn { get; } = DateTime.UtcNow;
        public int Id { get; } = Guid.NewGuid().GetHashCode();
    }

    
    public class TaskStatusChangedEvent : DomainEvent
    {
        public int TaskId { get; set; }
        public State OldStatus { get; set; }
        public State NewStatus { get; set; }
        public int ProjectManagerId { get; set; }
        public int? AssignedToId { get; set; }

        public TaskStatusChangedEvent(int taskId, State oldStatus, State newStatus, int projectManagerId, int? assignedToId)
        {
            TaskId = taskId;
            OldStatus = oldStatus;
            NewStatus = newStatus;
            ProjectManagerId = projectManagerId;
            AssignedToId = assignedToId;
        }
    }

    public class TaskCreatedEvent : DomainEvent
    {
        public int TaskId { get; set; }
        public string Title { get; set; }
        public DateTime EndDate { get; set; }
        public int ProjectManagerId { get; set; }

        public TaskCreatedEvent(int taskId, string title, DateTime endDate, int projectManagerId)
        {
            TaskId = taskId;
            Title = title;
            EndDate = endDate;
            ProjectManagerId = projectManagerId;
        }
    }

    
    public class UserStoryAddedEvent : DomainEvent
    {
        public int UserStoryId { get; set; }
        public string Title { get; set; }
        public int ProjectManagerId { get; set; }
        public int AssignedToId { get; set; }

        public UserStoryAddedEvent(int userStoryId, string title, int projectManagerId, int assignedToId)
        {
            UserStoryId = userStoryId;
            Title = title;
            ProjectManagerId = projectManagerId;
            AssignedToId = assignedToId;
        }
    }

    
    public class ProjectCreatedEvent : DomainEvent
    {
        public int ProjectId { get; set; }
        public string Name { get; set; }
        public int ProjectManagerId { get; set; }
        public int ServiceManagerId { get; set; }
        public int AdminUserId { get; set; }

        public ProjectCreatedEvent(int projectId, string name, int projectManagerId, int serviceManagerId, int adminUserId)
        {
            ProjectId = projectId;
            Name = name;
            ProjectManagerId = projectManagerId;
            ServiceManagerId = serviceManagerId;
            AdminUserId = adminUserId;
        }
    }

    
    public class UserRoleChangedEvent : DomainEvent
    {
        public int ChangedUserId { get; set; }
        public int ChangedByUserId { get; set; }
        public UserRole OldRole { get; set; }
        public UserRole NewRole { get; set; }

        public UserRoleChangedEvent(int changedUserId, int changedByUserId, UserRole oldRole, UserRole newRole)
        {
            ChangedUserId = changedUserId;
            ChangedByUserId = changedByUserId;
            OldRole = oldRole;
            NewRole = newRole;
        }
    }

    public class UserAddedEvent : DomainEvent
    {
        public int UserId { get; set; }
        public string FirstName { get; set; }
        public string Email { get; set; }
        public UserRole Role { get; set; }
        public int AddedByUserId { get; set; }

        public UserAddedEvent(int userId, string firstName, string email, UserRole role, int addedByUserId)
        {
            UserId = userId;
            FirstName = firstName;
            Email = email;
            Role = role;
            AddedByUserId = addedByUserId;
        }
    }

    
    public class TicketStatusChangedEvent : DomainEvent
    {
        public int TicketId { get; set; }
        public string OldStatus { get; set; }
        public string NewStatus { get; set; }
        public int ProjectManagerId { get; set; }

        public TicketStatusChangedEvent(int ticketId, string oldStatus, string newStatus, int projectManagerId)
        {
            TicketId = ticketId;
            OldStatus = oldStatus;
            NewStatus = newStatus;
            ProjectManagerId = projectManagerId;
        }
    }
}
