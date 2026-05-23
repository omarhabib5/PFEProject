using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.Service;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.ServiceHandler
{
    public class UpdateServiceCommandHandler : IRequestHandler<UpdateServiceCommand, Unit>
    {
        private readonly IApplicationDbSet _context;

        public UpdateServiceCommandHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(UpdateServiceCommand request, CancellationToken cancellationToken)
        {
            var service = await _context.Services.FindAsync(new object[] { request.id }, cancellationToken);

            if (service == null)
            {
                throw new KeyNotFoundException($"Service with id {request.id} not found");
            }

            if (request.ResponsibleId.HasValue)
            {
                if (request.ResponsibleId.Value <= 0)
                {
                    throw new ArgumentException($"ResponsibleId must be a positive value. Received: {request.ResponsibleId.Value}");
                }
                
                var userExists = await _context.Users.AnyAsync(u => u.Id == request.ResponsibleId.Value, cancellationToken);
                if (!userExists)
                {
                    throw new KeyNotFoundException($"User with ID {request.ResponsibleId.Value} not found.");
                }
            }

            var normalizedName = request.name?.Trim();
            if (string.IsNullOrWhiteSpace(normalizedName))
            {
                throw new ArgumentException("Service name is required.");
            }

            var duplicateNameExists = await _context.Services
                .AnyAsync(s => s.id != request.id && s.name != null && s.name.Trim().ToLower() == normalizedName.ToLower(), cancellationToken);

            if (duplicateNameExists)
            {
                throw new InvalidOperationException("A service with this name already exists.");
            }

            service.name = normalizedName;
            service.ResponsibleId = request.ResponsibleId;

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
