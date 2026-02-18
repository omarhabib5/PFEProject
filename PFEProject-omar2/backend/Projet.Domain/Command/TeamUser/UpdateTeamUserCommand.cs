using MediatR;
using Projet.Domain.Model;
using System.Text.Json.Serialization;

namespace Projet.Domain.Command.TeamUser
{
    public class UpdateTeamUserCommand : IRequest<Unit>
    {
        public int Id { get; set; }
        
        [JsonPropertyName("role")]
        public Role role { get; set; }
        
        public DateTime? LeftAt { get; set; }
    }
}
