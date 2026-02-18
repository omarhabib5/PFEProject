using MediatR;
using System.Text.Json.Serialization;

namespace Projet.Domain.Command.Team
{
    public class UpdateTeamCommand : IRequest<Unit>
    {
        [JsonPropertyName("id")]
        public int id { get; set; }
        
        [JsonPropertyName("name")]
        public string name { get; set; }
        
        public int ServiceId { get; set; }
    }
}
