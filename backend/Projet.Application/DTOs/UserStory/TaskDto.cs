using Projet.Domain.Model;

namespace Projet.Application.DTOs.UserStory;

public class TaskDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public State Status { get; set; }
    public int EstimatedHours { get; set; }
    public int? ActualHours { get; set; }
    public int UserStoryId { get; set; }
    public int? AssignedToId { get; set; }
    public string? AssignedToName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}