using MediatR;
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
                throw new Exception($"Team with id {request.id} not found");
            }

            team.name = request.name;

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
