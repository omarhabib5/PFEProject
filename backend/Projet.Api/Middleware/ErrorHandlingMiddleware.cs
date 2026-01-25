using Microsoft.IdentityModel.Tokens;
using System.Net;
using System.Text.Json;

namespace ProjectManagerAPI.API.Middleware
{
    public class ErrorHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ErrorHandlingMiddleware> _logger;

        public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var code = HttpStatusCode.InternalServerError;
            var message = "Une erreur interne s'est produite";

            switch (exception)
            {
                case UnauthorizedAccessException:
                    code = HttpStatusCode.Unauthorized;
                    message = "Non autorisé";
                    break;

                case KeyNotFoundException:
                    code = HttpStatusCode.NotFound;
                    message = "Ressource non trouvée";
                    break;

                case InvalidOperationException:
                case ArgumentException:
                    code = HttpStatusCode.BadRequest;
                    message = exception.Message;
                    break;

                case SecurityTokenException:
                    code = HttpStatusCode.Unauthorized;
                    message = "Token invalide ou expiré";
                    break;
            }

            _logger.LogError(exception, "Erreur non gérée: {Message}", exception.Message);

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)code;

            var response = new
            {
                error = message,
                details = context.Response.StatusCode == 500 ? null : exception.Message
            };

            var json = JsonSerializer.Serialize(response);
            return context.Response.WriteAsync(json);
        }
    }
}