using MediatR;

namespace Projet.Domain.Querie.User
{
    public class GetAllUsersQuery : IRequest<List<Model.User>>
    {
    }
}
