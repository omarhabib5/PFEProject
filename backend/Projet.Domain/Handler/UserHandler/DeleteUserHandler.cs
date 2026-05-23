using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.User;

namespace Projet.Domain.Handler.UserHandler
{
    public class DeleteUserHandler : IRequestHandler<DeleteUserCommand, bool>
    {
        private readonly Interface.IApplicationDbSet _context;

        public DeleteUserHandler(Interface.IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<bool> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == request.Id, cancellationToken);

            if (user == null)
                return false;

            var isProjectManager = await _context.Projects
                .AnyAsync(p => p.ProjectManagerId == request.Id, cancellationToken);

            if (isProjectManager)
                throw new InvalidOperationException("Cannot delete this user: they are the Project Manager of at least one project.");

            var assignedTasks = await _context.Tasks
                .Where(t => t.AssignedToId == request.Id)
                .ToListAsync(cancellationToken);

            foreach (var task in assignedTasks)
            {
                task.AssignedToId = null;
            }

            var assignedUserStories = await _context.UserStories
                .Where(us => us.AssignedToId == request.Id)
                .ToListAsync(cancellationToken);

            foreach (var userStory in assignedUserStories)
            {
                userStory.AssignedToId = null;
            }

            var responsibleServices = await _context.Services
                .Where(s => s.ResponsibleId == request.Id)
                .ToListAsync(cancellationToken);

            foreach (var service in responsibleServices)
            {
                service.ResponsibleId = null;
            }

            var teamLinks = await _context.TeamUser
                .Where(tu => tu.UserId == request.Id)
                .ToListAsync(cancellationToken);

            if (teamLinks.Count > 0)
            {
                _context.TeamUser.RemoveRange(teamLinks);
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
