using Projet.Domain.Interface;

namespace Projet.Api.Middlware
{
    public class JwtMiddleware
    {
        private readonly RequestDelegate _next;

        public JwtMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context, IJwtTokenService jwtTokenService)
        {
            var token = context.Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();

            if (token != null)
            {
                var userId = jwtTokenService.ValidateToken(token);
                if (userId != null)
                {
                    context.Items["UserId"] = userId;
                }
            }

            await _next(context);
        }
    }
}
