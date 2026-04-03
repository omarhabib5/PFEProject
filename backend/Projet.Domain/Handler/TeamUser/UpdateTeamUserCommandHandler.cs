using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.TeamUser;
using Projet.Domain.Interface;
using Projet.Domain.Model;

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
            if (request.role == Model.Role.ProjectLeader && teamUser.role != Model.Role.ProjectLeader)
            {
                var existingLeader = await _context.Set<Model.TeamUser>()
                    .AnyAsync(tu => tu.TeamId == teamUser.TeamId && tu.role == Model.Role.ProjectLeader && tu.LeftAt == null && tu.Id != request.Id, cancellationToken);

                if (existingLeader)
                {
                    throw new InvalidOperationException($"Team {teamUser.TeamId} already has a Project Leader. Only one leader is allowed per team.");
                }
            }

            var user = await _context.Users.FirstAsync(u => u.Id == teamUser.UserId, cancellationToken);

            teamUser.role = request.role;
            teamUser.LeftAt = request.LeftAt;

            if (request.role == Model.Role.ProjectLeader)
            {
                if (user.role == UserRole.Employee)
                {
                    user.role = UserRole.ProjectManager;
                }
            }
            else if (teamUser.role != Model.Role.ProjectLeader)
            {
                var hasOtherActiveLeader = await _context.Set<Model.TeamUser>()
                    .AnyAsync(tu => tu.UserId == user.Id && tu.role == Model.Role.ProjectLeader && tu.LeftAt == null && tu.Id != request.Id, cancellationToken);

                if (!hasOtherActiveLeader && user.role == UserRole.ProjectManager)
                {
                    user.role = UserRole.Employee;
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
