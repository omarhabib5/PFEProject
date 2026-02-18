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
         
            if (!request.TeamId.HasValue)
            {
                throw new ArgumentException("TeamId is required.");
            }

           
            var userExists = await _context.Users.AnyAsync(u => u.Id == request.UserId, cancellationToken);
            if (!userExists)
            {
                throw new KeyNotFoundException($"User with ID {request.UserId} not found.");
            }

          
            var teamExists = await _context.Teams.AnyAsync(t => t.id == request.TeamId.Value, cancellationToken);
            if (!teamExists)
            {
                throw new KeyNotFoundException($"Team with ID {request.TeamId.Value} not found.");
            }

            var existingTeamUser = await _context.Set<Model.TeamUser>()
                .FirstOrDefaultAsync(tu => tu.UserId == request.UserId && tu.TeamId == request.TeamId.Value && tu.LeftAt == null, cancellationToken);

            if (existingTeamUser != null)
            {
                throw new InvalidOperationException($"User {request.UserId} is already a member of Team {request.TeamId.Value}.");
            }

           
            if (request.role == Model.Role.ProjectLeader)
            {
                var existingLeader = await _context.Set<Model.TeamUser>()
                    .AnyAsync(tu => tu.TeamId == request.TeamId.Value && tu.role == Model.Role.ProjectLeader && tu.LeftAt == null, cancellationToken);

                if (existingLeader)
                {
                    throw new InvalidOperationException($"Team {request.TeamId.Value} already has a Project Leader. Only one leader is allowed per team.");
                }
            }

            var teamUser = new Model.TeamUser
            {
                UserId = request.UserId,
                TeamId = request.TeamId.Value,
                role = request.role,
                JoinedAt = DateTime.UtcNow
            };

            _context.Set<Model.TeamUser>().Add(teamUser);
            await _context.SaveChangesAsync(cancellationToken);

            return teamUser.Id;
        }
    }
}
