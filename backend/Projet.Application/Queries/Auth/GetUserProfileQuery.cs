using MediatR;
using Microsoft.Extensions.Logging;
using Projet.Application.DTOs.Auth;
using Projet.Application.Interfaces;
using Projet.Domain.Enums;

namespace Projet.Application.Queries.Auth
{
    public class GetUserProfileQuery : IRequest<UserInfoResponse>
    {
        public Guid UserId { get; }

        public GetUserProfileQuery(Guid userId)
        {
            UserId = userId;
        }
    }

    public class GetUserProfileQueryHandler : IRequestHandler<GetUserProfileQuery, UserInfoResponse>
    {
        private readonly IUserRepository _userRepository;
        private readonly ILogger<GetUserProfileQueryHandler> _logger;

        public GetUserProfileQueryHandler(IUserRepository userRepository, ILogger<GetUserProfileQueryHandler> logger)
        {
            _userRepository = userRepository;
            _logger = logger;
        }

        public async Task<UserInfoResponse> Handle(GetUserProfileQuery request, CancellationToken cancellationToken)
        {
            try
            {
                var user = await _userRepository.GetByIdAsync(request.UserId);
                if (user == null)
                {
                    throw new KeyNotFoundException("User not found");
                }

                return new UserInfoResponse
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    UserName = user.Username,
                    Role = user.Role.ToString(),
                    RoleDisplayName = user.Role.GetDisplayName(),
                    profileImageUrl = user.ProfileImageUrl,
                    CreatedAt = user.CreatAt,
                    UpdatedAt = user.UpdatedAt,
                    LastLoginAt = user.LastLoginAt,
                    IsEmailConfirmed = user.IsEmailVerified
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while getting user profile for UserId: {UserId}", request.UserId);
                throw;
            }
        }
    }
}

