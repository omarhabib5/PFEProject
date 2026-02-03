using MediatR;
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
            var service = new Model.Service
            {
                name = request.name
            };

            _context.Services.Add(service);
            await _context.SaveChangesAsync(cancellationToken);

            return service.id;
        }
    }
}
