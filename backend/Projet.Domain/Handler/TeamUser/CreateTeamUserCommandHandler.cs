using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.TeamUser;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.TeamUser
{
    public class CreateTeamUserCommandHandler : IRequestHandler<CreateTeamUserCommand, int>
    {
        private readonly IApplicationDbSet _context;

        public CreateTeamUserCommandHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<int> Handle(CreateTeamUserCommand request, CancellationToken cancellationToken)
        {
            // Validate that User exists
            var userExists = await _context.Users.AnyAsync(u => u.Id == request.UserId, cancellationToken);
            if (!userExists)
            {
                throw new KeyNotFoundException($"User with ID {request.UserId} not found.");
            }

            // Validate that Team exists
            var teamExists = await _context.Teams.AnyAsync(t => t.id == request.TeamId, cancellationToken);
            if (!teamExists)
            {
                throw new KeyNotFoundException($"Team with ID {request.TeamId} not found.");
            }

            // Check if TeamUser already exists
            var existingTeamUser = await _context.Set<Model.TeamUser>()
                .FirstOrDefaultAsync(tu => tu.UserId == request.UserId && tu.TeamId == request.TeamId && tu.LeftAt == null, cancellationToken);

            if (existingTeamUser != null)
            {
                throw new InvalidOperationException($"User {request.UserId} is already a member of Team {request.TeamId}.");
            }

            var teamUser = new Model.TeamUser
            {
                UserId = request.UserId,
                TeamId = request.TeamId,
                role = request.role,
                JoinedAt = DateTime.UtcNow
            };

            _context.Set<Model.TeamUser>().Add(teamUser);
            await _context.SaveChangesAsync(cancellationToken);

            return teamUser.Id;
        }
    }
}
