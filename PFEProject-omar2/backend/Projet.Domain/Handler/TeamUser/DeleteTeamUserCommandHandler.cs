using MediatR;
using Projet.Domain.Command.TeamUser;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.TeamUser
{
    public class DeleteTeamUserCommandHandler : IRequestHandler<DeleteTeamUserCommand, Unit>
    {
        private readonly IApplicationDbSet _context;

        public DeleteTeamUserCommandHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(DeleteTeamUserCommand request, CancellationToken cancellationToken)
        {
            var teamUser = await _context.Set<Model.TeamUser>().FindAsync(new object[] { request.Id }, cancellationToken);

            if (teamUser == null)
            {
                throw new KeyNotFoundException($"TeamUser with ID {request.Id} not found.");
            }

            _context.Set<Model.TeamUser>().Remove(teamUser);
            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
