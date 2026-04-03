using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.TeamUser;
using Projet.Domain.Interface;
using Projet.Domain.Model;

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

            var user = await _context.Users.FirstAsync(u => u.Id == teamUser.UserId, cancellationToken);

            _context.Set<Model.TeamUser>().Remove(teamUser);

            if (teamUser.role == Role.ProjectLeader)
            {
                var hasOtherActiveLeader = await _context.Set<Model.TeamUser>()
                    .AnyAsync(tu => tu.UserId == user.Id && tu.role == Role.ProjectLeader && tu.LeftAt == null && tu.Id != request.Id, cancellationToken);

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
