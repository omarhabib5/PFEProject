using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.Service;
using Projet.Domain.Interface;

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

            var linkedProjectsCount = await _context.Projects
                .CountAsync(p => p.ServiceId == request.id, cancellationToken);

            var linkedUsersCount = await _context.Users
                .CountAsync(u => u.Serviceid == request.id, cancellationToken);

            if (linkedProjectsCount > 0 || linkedUsersCount > 0)
            {
                var linkedProjectNames = await _context.Projects
                    .Where(p => p.ServiceId == request.id)
                    .Select(p => p.name)
                    .Take(5)
                    .ToListAsync(cancellationToken);

                var linkedUserNames = await _context.Users
                    .Where(u => u.Serviceid == request.id)
                    .Select(u => $"{u.FirstName} {u.LastName}".Trim())
                    .Take(5)
                    .ToListAsync(cancellationToken);

                var projectDetails = linkedProjectNames.Count > 0
                    ? $" Projects: {string.Join(", ", linkedProjectNames)}"
                    : string.Empty;

                var userDetails = linkedUserNames.Count > 0
                    ? $" Users: {string.Join(", ", linkedUserNames)}"
                    : string.Empty;

                throw new InvalidOperationException(
                    $"Cannot delete service '{service.name}' because it is linked to {linkedProjectsCount} project(s) and {linkedUsersCount} user(s).{projectDetails}{userDetails} Remove or reassign these records first.");
            }

            try
            {
                _context.Services.Remove(service);
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                throw new InvalidOperationException(
                    $"Cannot delete service '{service.name}' because it is still referenced by other records.");
            }

            return Unit.Value;
        }
    }
}
