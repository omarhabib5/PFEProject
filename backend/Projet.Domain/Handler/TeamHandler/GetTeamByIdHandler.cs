using MediatR;
using Projet.Domain.Interface;
using Projet.Domain.Querie.Team;

namespace Projet.Domain.Handler.TeamHandler
{
    public class GetTeamByIdHandler : IRequestHandler<GetTeamById, Model.Team>
    {
        private readonly IApplicationDbSet _context;

        public GetTeamByIdHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Model.Team> Handle(GetTeamById request, CancellationToken cancellationToken)
        {
            var team = await _context.Teams.FindAsync(new object[] { request.id }, cancellationToken);
            
            if (team == null)
            {
                throw new Exception($"Team with id {request.id} not found");
            }

            return team;
        }
    }
}
