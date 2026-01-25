using Microsoft.Extensions.DependencyInjection;
using Projet.Application.Interfaces;
using Projet.Infrastructure.Persistence.Repositories;
using Projet.Infrastructure.Services;

namespace Projet.Infrastructure.Services
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
        {
            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IJwtService, JwtService>();
            services.AddScoped<ICurrentUserService, CurrentUserService>();
            services.AddScoped<IPasswordHasher, PasswordHasher>();

            return services;
        }
    }
}
