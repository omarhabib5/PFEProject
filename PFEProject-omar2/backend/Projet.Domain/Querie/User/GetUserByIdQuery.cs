using MediatR;

namespace Projet.Domain.Querie.User
{
    public class GetUserByIdQuery : IRequest<Model.User?>
    {
        public int Id { get; set; }

        public GetUserByIdQuery(int id)
        {
            Id = id;
        }
    }
}
