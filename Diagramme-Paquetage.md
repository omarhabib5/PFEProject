C4Component
title Diagramme de Paquetage - Architecture du Système de Gestion de Projet

    Person(user, "Utilisateur", "Chef de projet, Membre d'équipe, Administrateur")

    Container_Boundary(frontend, "Frontend - Angular") {
        Component(angular_app, "Application Web Angular", "TypeScript, Angular", "Interface utilisateur pour la gestion de projets, sprints, tâches et équipes")
        Component(angular_services, "Services Angular", "TypeScript", "Services pour l'authentification, API calls, gestion d'état")
        Component(angular_components, "Composants Angular", "TypeScript", "Composants UI réutilisables")
    }

    Container_Boundary(api_layer, "Projet.Api - Couche API") {
        Component(auth_controller, "AuthController", "C# Controller", "Gestion de l'authentification et autorisation")
        Component(project_controller, "ProjectController", "C# Controller", "Opérations CRUD sur les projets")
        Component(sprint_controller, "SprintController", "C# Controller", "Gestion des sprints")
        Component(task_controller, "TaskController", "C# Controller", "Gestion des tâches")
        Component(user_story_controller, "UserStoryController", "C# Controller", "Gestion des user stories")
        Component(team_controller, "TeamController", "C# Controller", "Gestion des équipes")
        Component(user_controller, "UserController", "C# Controller", "Gestion des utilisateurs")
        Component(jwt_middleware, "JwtMiddleware", "Middleware", "Validation des tokens JWT")
        Component(error_middleware, "ErrorHandlingMiddleware", "Middleware", "Gestion centralisée des erreurs")
    }

    Container_Boundary(application_layer, "Projet.Application - Couche Application") {
        Component(dtos, "DTOs", "C# Classes", "Objets de transfert de données")
        Component(app_handlers, "Handlers", "C# Classes", "Gestionnaires de commandes et requêtes")
        Component(app_queries, "Queries", "C# Classes", "Définitions des requêtes")
        Component(app_context, "DbContext", "Entity Framework", "Contexte de base de données")
    }

    Container_Boundary(domain_layer, "Projet.Domain - Couche Domaine") {
        Component(domain_models, "Models", "C# Entities", "Entités métier: Project, Sprint, Task, User, Team, UserStory")
        Component(domain_commands, "Commands", "C# Classes", "Commandes métier (CQRS)")
        Component(domain_queries, "Queries", "C# Interfaces", "Requêtes métier (CQRS)")
        Component(domain_handlers, "Handlers", "C# Classes", "Gestionnaires métier")
        Component(domain_interfaces, "Interfaces", "C# Interfaces", "Contrats de services et repositories")
        Component(utilities, "Utilities", "C# Classes", "Classes utilitaires du domaine")
    }

    Container_Boundary(infrastructure_layer, "Projet.Infrastructure - Couche Infrastructure") {
        Component(repositories, "Repositories", "C# Classes", "Implémentation des repositories")
        Component(infra_services, "Services", "C# Classes", "Services d'infrastructure (Email, Storage, etc.)")
        Component(infra_utilities, "Utilities", "C# Classes", "Utilitaires d'infrastructure")
    }

    ContainerDb(database, "Base de Données", "SQL Server", "Stockage des projets, sprints, tâches, utilisateurs, équipes")

    System_Ext(docker, "Docker", "Conteneurisation de l'application")
    System_Ext(jenkins, "Jenkins", "CI/CD Pipeline")

    Rel(user, angular_app, "Utilise", "HTTPS")
    Rel(angular_app, angular_services, "Utilise")
    Rel(angular_app, angular_components, "Utilise")

    Rel(angular_services, auth_controller, "Appels API", "JSON/HTTPS")
    Rel(angular_services, project_controller, "Appels API", "JSON/HTTPS")
    Rel(angular_services, sprint_controller, "Appels API", "JSON/HTTPS")
    Rel(angular_services, task_controller, "Appels API", "JSON/HTTPS")
    Rel(angular_services, user_story_controller, "Appels API", "JSON/HTTPS")
    Rel(angular_services, team_controller, "Appels API", "JSON/HTTPS")
    Rel(angular_services, user_controller, "Appels API", "JSON/HTTPS")

    Rel(jwt_middleware, auth_controller, "Sécurise")
    Rel(error_middleware, auth_controller, "Intercepte les erreurs")

    Rel(auth_controller, app_handlers, "Utilise")
    Rel(project_controller, app_handlers, "Utilise")
    Rel(sprint_controller, app_handlers, "Utilise")
    Rel(task_controller, app_handlers, "Utilise")
    Rel(user_story_controller, app_handlers, "Utilise")
    Rel(team_controller, app_handlers, "Utilise")
    Rel(user_controller, app_handlers, "Utilise")

    Rel(app_handlers, dtos, "Utilise")
    Rel(app_handlers, app_queries, "Exécute")
    Rel(app_handlers, domain_handlers, "Délègue à")

    Rel(app_context, domain_models, "Mappe")
    Rel(app_context, database, "Lit/Écrit", "Entity Framework")

    Rel(domain_handlers, domain_commands, "Exécute")
    Rel(domain_handlers, domain_interfaces, "Implémente")
    Rel(domain_handlers, domain_models, "Manipule")
    Rel(domain_handlers, utilities, "Utilise")

    Rel(domain_interfaces, repositories, "Définit le contrat")
    Rel(repositories, database, "Accède", "ADO.NET/EF Core")
    Rel(repositories, domain_models, "Persiste/Récupère")

    Rel(infra_services, domain_interfaces, "Implémente")
    Rel(infra_services, infra_utilities, "Utilise")

    Rel(docker, angular_app, "Conteneurise")
    Rel(docker, auth_controller, "Conteneurise")
    Rel(jenkins, docker, "Déploie via")

    UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="1")
