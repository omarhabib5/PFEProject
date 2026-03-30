using MediatR;
using Microsoft.EntityFrameworkCore;
using Projet.Domain.Interface;
using Projet.Domain.Model;
using Projet.Domain.Querie.UserStory;
using UserStoryEntity = Projet.Domain.Model.UserStory;

namespace Projet.Domain.Handler.UserStory;

public class GetUserStoriesBySprintHandler : IRequestHandler<GetUserStoriesBySprintQuery, List<UserStoryEntity>>
{
    private readonly IApplicationDbSet _context;

    public GetUserStoriesBySprintHandler(IApplicationDbSet context)
    {
        _context = context;
    }

    public async Task<List<UserStoryEntity>> Handle(GetUserStoriesBySprintQuery request, CancellationToken cancellationToken)
    {
        return await _context.UserStories
            .Where(us => us.SprintId == request.SprintId)
            .Include(us => us.AssignedTo)
            .Include(us => us.Tasks)
            .ToListAsync(cancellationToken);
    }
}
