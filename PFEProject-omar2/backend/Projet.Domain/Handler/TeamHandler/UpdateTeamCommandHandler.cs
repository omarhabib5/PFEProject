using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.Team;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.TeamHandler
{
    public class UpdateTeamCommandHandler : IRequestHandler<UpdateTeamCommand, Unit>
    {
        private readonly IApplicationDbSet _context;

        public UpdateTeamCommandHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(UpdateTeamCommand request, CancellationToken cancellationToken)
        {
            var team = await _context.Teams.FindAsync(new object[] { request.id }, cancellationToken);
            
            if (team == null)
            {
                throw new KeyNotFoundException($"Team with id {request.id} not found");
            }

          
            var serviceExists = await _context.Services.AnyAsync(s => s.id == request.ServiceId, cancellationToken);
            if (!serviceExists)
            {
                throw new KeyNotFoundException($"Service with ID {request.ServiceId} not found.");
            }

            team.name = request.name;
            team.ServiceId = request.ServiceId; 

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
