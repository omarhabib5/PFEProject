using MediatR;
using System.Text.Json.Serialization;

namespace Projet.Domain.Command.Team
{
    public class CreateTeamCommand : IRequest<int>
    {
        [JsonPropertyName("name")]
        public string name { get; set; }
        
        public int ServiceId { get; set; }
    }
}
