using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using Projet.Domain.Command.UserStory;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.UserStory
{
    public class DeleteUserStoryHandler : IRequestHandler<DeleteUserStoryCommand, Unit>
    {
        private readonly IApplicationDbSet context;

        public DeleteUserStoryHandler(IApplicationDbSet context)
        {
            this.context = context;
        }

        public async Task<Unit> Handle(DeleteUserStoryCommand request, CancellationToken cancellationToken)
        {
            var userStory = context.UserStories.FirstOrDefault(us => us.id == request.Id);
            if (userStory == null)
            {
                throw new KeyNotFoundException($"UserStory with ID {request.Id} not found.");
            }

            var tasks = context.Tasks.Where(t => t.UserStoryId == userStory.id);
            context.Tasks.RemoveRange(tasks);

            context.UserStories.Remove(userStory);
            await context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
