using MediatR;
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
            var team = new Model.Team
            {
                name = request.name
            };

            _context.Teams.Add(team);
            await _context.SaveChangesAsync(cancellationToken);

            return team.id;
        }
    }
}
