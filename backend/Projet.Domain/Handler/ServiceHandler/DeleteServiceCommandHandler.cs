using MediatR;
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
                throw new Exception($"Service with id {request.id} not found");
            }

            _context.Services.Remove(service);
            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
