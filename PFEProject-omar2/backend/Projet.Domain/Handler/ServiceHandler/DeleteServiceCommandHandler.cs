using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.Service;
using Projet.Domain.Interface;
using System.Collections.Generic;
using System.Linq;

namespace Projet.Domain.Handler.ServiceHandler
{
    public class DeleteServiceCommandHandler : IRequestHandler<DeleteServiceCommand, Unit>
    {
        private readonly IApplicationDbSet _context;

        public DeleteServiceCommandHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(DeleteServiceCommand request, CancellationToken cancellationToken)
        {
            var service = await _context.Services.FindAsync(new object[] { request.id }, cancellationToken);
            
            if (service == null)
            {
                throw new KeyNotFoundException($"Service with id {request.id} not found");
            }

            var relatedProjects = await _context.Projects
                .Where(project => project.ServiceId == request.id)
                .ToListAsync(cancellationToken);

            foreach (var project in relatedProjects)
            {
                project.ServiceId = null;
            }

            var teamIds = await _context.Teams
                .Where(team => team.ServiceId == request.id)
                .Select(team => team.id)
                .ToListAsync(cancellationToken);

            if (teamIds.Count > 0)
            {
                var teamProjects = await _context.Projects
                    .Where(project => project.TeamId.HasValue && teamIds.Contains(project.TeamId.Value))
                    .ToListAsync(cancellationToken);

                foreach (var project in teamProjects)
                {
                    project.TeamId = null;
                }

                var teamUsers = await _context.TeamUser
                    .Where(teamUser => teamIds.Contains(teamUser.TeamId))
                    .ToListAsync(cancellationToken);

                _context.TeamUser.RemoveRange(teamUsers);

                var teams = await _context.Teams
                    .Where(team => teamIds.Contains(team.id))
                    .ToListAsync(cancellationToken);

                _context.Teams.RemoveRange(teams);
            }

            _context.Services.Remove(service);
            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
