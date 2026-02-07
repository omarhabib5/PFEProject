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
                name = request.name,
                ResponsibleId = request.ResponsibleId
            };

            _context.Services.Add(service);
            await _context.SaveChangesAsync(cancellationToken);

            return service.id;
        }
    }
}
