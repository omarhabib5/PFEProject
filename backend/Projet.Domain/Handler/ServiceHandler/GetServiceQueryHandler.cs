using MediatR;
using Projet.Domain.Interface;
using Projet.Domain.Querie.Service;

namespace Projet.Domain.Handler.ServiceHandler
{
    public class GetServiceQueryHandler : IRequestHandler<GetServiceById, Model.Service>
    {
        private readonly IApplicationDbSet _context;

        public GetServiceQueryHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<Model.Service> Handle(GetServiceById request, CancellationToken cancellationToken)
        {
            var service = await _context.Services.FindAsync(new object[] { request.id }, cancellationToken);
            
            if (service == null)
            {
                throw new Exception($"Service with id {request.id} not found");
            }

            return service;
        }
    }
}
