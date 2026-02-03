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
                throw new Exception($"Service with id {request.id} not found");
            }

            service.name = request.name;

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
