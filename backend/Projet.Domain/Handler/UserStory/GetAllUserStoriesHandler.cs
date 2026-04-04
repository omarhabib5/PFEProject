using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Querie.UserStory;
using UserStoryEntity = Projet.Domain.Model.UserStory;

namespace Projet.Domain.Handler.UserStory;

public class GetAllUserStoriesHandler : IRequestHandler<GetAllUserStoriesQuery, List<UserStoryEntity>>
{
    private readonly IApplicationDbSet _context;

    public GetAllUserStoriesHandler(IApplicationDbSet context)
    {
        _context = context;
    }

    public async Task<List<UserStoryEntity>> Handle(GetAllUserStoriesQuery request, CancellationToken cancellationToken)
    {
        return await _context.UserStories
            .Include(us => us.AssignedTo)
            .Include(us => us.Tasks)
            .ToListAsync(cancellationToken);
    }
}
