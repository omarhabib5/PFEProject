using MediatR;
using Projet.Domain.Command.User;
using Projet.Domain.Interface;

namespace Projet.Domain.Handler.UserHandler
{
    public class CreateUserHandler : IRequestHandler<CreateUserCommand, Model.User>
    {
        private readonly IApplicationDbSet _context;
        private readonly IPasswordHasher _passwordHasher;

        public CreateUserHandler(IApplicationDbSet context, IPasswordHasher passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        public async System.Threading.Tasks.Task<Model.User> Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            var user = new Model.User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                PasswordHash = _passwordHasher.HashPassword(request.Password),
                role = request.Role
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);

            return user;
        }
    }
}
