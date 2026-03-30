using Projet.Domain.Model;

namespace Projet.Application.DTOs.UserStory;

public class UserStoryDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? AcceptanceCriteria { get; set; }
    public int StoryPoints { get; set; }
    public int Priority { get; set; }
    public State Status { get; set; }
    public int SprintId { get; set; }
    public int ProjectId { get; set; }
    public int? AssignedToId { get; set; }
    public string? AssignedToName { get; set; }
    public int TaskCount { get; set; }
    public int CompletedTaskCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
