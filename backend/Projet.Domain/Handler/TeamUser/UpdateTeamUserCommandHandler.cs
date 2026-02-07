using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.TeamUser;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.TeamUser
{
    public class UpdateTeamUserCommandHandler : IRequestHandler<UpdateTeamUserCommand, Unit>
    {
        private readonly IApplicationDbSet _context;

        public UpdateTeamUserCommandHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(UpdateTeamUserCommand request, CancellationToken cancellationToken)
        {
            var teamUser = await _context.Set<Model.TeamUser>().FindAsync(new object[] { request.Id }, cancellationToken);

            if (teamUser == null)
            {
                throw new KeyNotFoundException($"TeamUser with ID {request.Id} not found.");
            }

            teamUser.role = request.role;
            teamUser.LeftAt = request.LeftAt;

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
