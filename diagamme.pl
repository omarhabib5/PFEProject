@startuml
' Définition des paquetages
package "Frontend (Angular)" {
  package "Components" <<ui>>
  package "Pages" <<ui>>
  package "Services" <<logic>>
 
}

package "Backend (ASP.NET Core)" {
  package "Api" <<api>>{
    package "Controllers"
    package "Migartions"
    package "Middleware"
  }
  package "Application" <<usecases>> {
    package "Context"
    package "DTOs"
  
  }
  package "Domain" <<core>> {
    package "Commands"
    package "Handlers"
    package "Interfaces"
    package "Models"
    package "Queries"

  }
  
  package "Infrastructure" <<data>> {
    package "Service" <<EF>>
    package "Repositories"
   
  }
}

' Dépendances
Frontend ..> Backend : "appels HTTPS"
Controllers ..> Application : "utilise"
Controllers ..> Domain : "utilise"
Controllers ..> Infrastructure: "utilise"
Application ..> Domain : "dépend"
Infrastructure ..> Domain : "implémente interfaces"
Infrastructure ..> Application: "utilise"
@enduml