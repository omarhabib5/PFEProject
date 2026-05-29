FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["Projet.Api/Projet.Api.csproj", "Projet.Api/"]
COPY ["Projet.Application/Projet.Application.csproj", "Projet.Application/"]
COPY ["Projet.Domain/Projet.Domain.csproj", "Projet.Domain/"]
COPY ["Projet.Infrastructure/Projet.Infrastructure.csproj", "Projet.Infrastructure/"]
RUN dotnet restore "Projet.Api/Projet.Api.csproj"

COPY . .
WORKDIR "/src/Projet.Api"
RUN dotnet publish "Projet.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
EXPOSE 443
ENV ASPNETCORE_URLS="https://+:443;http://+:8080"
ENTRYPOINT ["dotnet", "Projet.Api.dll"]
