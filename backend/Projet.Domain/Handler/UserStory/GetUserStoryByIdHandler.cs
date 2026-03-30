using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Model;
using Projet.Domain.Querie.UserStory;
using UserStoryEntity = Projet.Domain.Model.UserStory;

namespace Projet.Domain.Handler.UserStory;

public class GetUserStoryByIdHandler : IRequestHandler<GetUserStoryByIdQuery, UserStoryEntity>
{
    private readonly IApplicationDbSet _context;

    public GetUserStoryByIdHandler(IApplicationDbSet context)
    {
        _context = context;
    }

    public async Task<UserStoryEntity> Handle(GetUserStoryByIdQuery request, CancellationToken cancellationToken)
    {
        return await _context.UserStories
            .Include(us => us.AssignedTo)
            .Include(us => us.Tasks)
                .ThenInclude(t => t.AssignedTo)
            .FirstOrDefaultAsync(us => us.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"UserStory with Id {request.Id} not found");
    }
}
