using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Querie.UserStory;
using UserStoryEntity = Projet.Domain.Model.UserStory;

namespace Projet.Domain.Handler.UserStory;

public class GetUserStoriesByProjectHandler : IRequestHandler<GetUserStoriesByProjectQuery, List<UserStoryEntity>>
{
    private readonly IApplicationDbSet _context;

    public GetUserStoriesByProjectHandler(IApplicationDbSet context)
    {
        _context = context;
    }

    public async Task<List<UserStoryEntity>> Handle(GetUserStoriesByProjectQuery request, CancellationToken cancellationToken)
    {
        return await _context.UserStories
            .Where(us => us.ProjectId == request.ProjectId)
            .Include(us => us.AssignedTo)
            .Include(us => us.Tasks)
            .ToListAsync(cancellationToken);
    }
}
