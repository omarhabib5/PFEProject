using Microsoft.AspNetCore.Authentication;
using Microsoft.OpenApi;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Projet.Application;
using Projet.Infrastructure.Persistence;
using Projet.Infrastructure.Services;
using ProjectManagerAPI.API.Middleware;
using System.Text;


var builder = WebApplication.CreateBuilder(args);

// 1. Configuration CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});


builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
    b => b.MigrationsAssembly("Projet.Infrastructure")));

// 3. Configuration JWT
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
builder.Services.Configure<JwtSettings>(jwtSettings);

var secretKey = jwtSettings["Secret"] ??
    throw new InvalidOperationException("JWT Secret non configuré");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secretKey)),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});


builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireProductOwner", policy =>
        policy.RequireRole("ProductOwner"));

    options.AddPolicy("RequireScrumMaster", policy =>
        policy.RequireRole("ScrumMaster", "ProductOwner"));

    options.AddPolicy("RequireTeamMember", policy =>
        policy.RequireRole("DevelopmentTeam", "ScrumMaster", "ProductOwner"));

    options.AddPolicy("RequireStakeholder", policy =>
        policy.RequireRole("Stakeholder", "DevelopmentTeam", "ScrumMaster", "ProductOwner"));
});


builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices();


builder.Services.AddHttpContextAccessor();


builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });



// Swagger configuration
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddLogging();


var app = builder.Build();



if (app.Environment.IsDevelopment())
{
    // Swagger UI only in Development
    app.UseSwagger();
    app.UseSwaggerUI();

    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
}

app.UseHttpsRedirection();
app.UseCors("AllowAngularApp");


app.UseMiddleware<ErrorHandlingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();