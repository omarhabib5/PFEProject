using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.Team;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.TeamHandler
{
    public class DeleteTeamCommandHandler : IRequestHandler<DeleteTeamCommand, Unit>
    {
        private readonly IApplicationDbSet _context;

        public DeleteTeamCommandHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(DeleteTeamCommand request, CancellationToken cancellationToken)
        {
            var team = await _context.Teams.FindAsync(new object[] { request.id }, cancellationToken);

            
            if (team == null)
            {
                throw new Exception($"Team with id {request.id} not found");
            }
            var hasProjects = await _context.Projects.AnyAsync(p => p.TeamId == request.id, cancellationToken);
            if (hasProjects)
            {
                throw new InvalidOperationException($"Cannot delete Team with id {request.id} because it is referenced by one or more Projects. Please reassign or delete the Projects first.");
            }
            _context.Teams.Remove(team);
            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
