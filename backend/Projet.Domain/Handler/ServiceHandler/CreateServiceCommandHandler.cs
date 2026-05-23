using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Command.Service;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.ServiceHandler
{
    public class CreateServiceCommandHandler : IRequestHandler<CreateServiceCommand, int>
    {
        private readonly IApplicationDbSet _context;

        public CreateServiceCommandHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<int> Handle(CreateServiceCommand request, CancellationToken cancellationToken)
        {
            var normalizedName = request.name?.Trim();
            if (string.IsNullOrWhiteSpace(normalizedName))
            {
                throw new ArgumentException("Service name is required.");
            }

            var duplicateNameExists = await _context.Services
                .AnyAsync(s => s.name != null && s.name.Trim().ToLower() == normalizedName.ToLower(), cancellationToken);

            if (duplicateNameExists)
            {
                throw new InvalidOperationException("A service with this name already exists.");
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

            var service = new Model.Service
            {
                name = normalizedName,
                ResponsibleId = request.ResponsibleId
            };

            _context.Services.Add(service);
            await _context.SaveChangesAsync(cancellationToken);

            return service.id;
        }
    }
}
