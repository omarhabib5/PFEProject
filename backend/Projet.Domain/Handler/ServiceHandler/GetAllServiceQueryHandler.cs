using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Querie.Service;

namespace Projet.Domain.Handler.ServiceHandler
{
    public class GetAllServiceQueryHandler : IRequestHandler<GetAllServiceQuery, List<Model.Service>>
    {
        private readonly IApplicationDbSet _context;

        public GetAllServiceQueryHandler(IApplicationDbSet context)
        {
            _context = context;
        }

        public async Task<List<Model.Service>> Handle(GetAllServiceQuery request, CancellationToken cancellationToken)
        {
            return await _context.Services
    .Include(s => s.Responsible)
    .ToListAsync(cancellationToken);
        }
    }
}
