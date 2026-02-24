using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Querie.UserStory;
using Projet.Domain.Interface;
using Microsoft.EntityFrameworkCore;

namespace Projet.Domain.Handler.UserStory
{
    public class GetUserStoryByIdHandler : IRequestHandler<GetUserStoryByIdQuery, Model.UserStory>
    {
        private readonly IApplicationDbSet context;

        public GetUserStoryByIdHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<Model.UserStory> Handle(GetUserStoryByIdQuery request, CancellationToken cancellationToken)
        {
            var userStory = await context.UserStories
                .Include(us => us.Sprint)
                .Include(us => us.Project)
                .Include(us => us.Tasks)
                .FirstOrDefaultAsync(us => us.id == request.Id, cancellationToken);

            if (userStory == null)
            {
                throw new KeyNotFoundException($"UserStory with ID {request.Id} not found.");
            }

            return userStory;
        }
    }
}
