using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.Team;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.TeamHandler
{
    public class CreateTeamCommandHandler : IRequestHandler<CreateTeamCommand, int>
    {
        private readonly IApplicationDbSet _context;

        public CreateTeamCommandHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<int> Handle(CreateTeamCommand request, CancellationToken cancellationToken)
        {
           
            var serviceExists = await _context.Services.AnyAsync(s => s.id == request.ServiceId, cancellationToken);
            if (!serviceExists)
            {
                throw new KeyNotFoundException($"Service with ID {request.ServiceId} not found.");
            }

            var team = new Model.Team
            {
                name = request.name,
                ServiceId = request.ServiceId  // ⚠️ AJOUTER
            };

            _context.Teams.Add(team);
            await _context.SaveChangesAsync(cancellationToken);

            return team.id;
        }
    }
}
