using MediatR;
using Projet.Domain.Model;
using System.Text.Json.Serialization;
namespace Projet.Domain.Command.TeamUser
{
    public class CreateTeamUserCommand : IRequest<int>
    {
        public int UserId { get; set; }
        public int? TeamId { get; set; }
        [JsonPropertyName("role")]
        public Role role { get; set; }
    }
}
