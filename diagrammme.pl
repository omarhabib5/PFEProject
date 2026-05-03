@startuml
title Séquence de création d'un projet (inspiré du diagramme "Création du chantier")

actor "Directeur" as Dir
participant "Interface" as UI
participant "Controller" as Ctrl
participant "Modèle" as Model
database "Base de données" as DB

== Saisie des données ==
Dir -> UI: SaisirDonnées(NomProjet, emplacement, dateDebut, \nDateFin, DateSignatureContrat, Client, code, etat)
UI -> UI: Contrôle saisie

== Sélection du client ==
UI -> Ctrl: SélectionnerClient()
Ctrl -> DB: GetAll()
DB --> Ctrl: ListeClients
Ctrl --> UI: ListeClients
UI -> Dir: Afficher(ListeClients)
Dir --> UI: ChoisirClient()

== Sélection du chef de chantier ==
UI -> Ctrl: SélectionnerChefChantier()
Ctrl -> DB: GetAll()
DB --> Ctrl: ListeChefsChantier
Ctrl --> UI: ListeChefsChantier
UI -> Dir: Afficher(listeChefsChantier)
Dir --> UI: ChoisirChefChantier()

== Ajout du chantier avec vérification ==
UI -> Ctrl: AjouterChantier(NomProjet, emplacement, dateDebut, \nDateFin, DateSignatureContrat, code, etat, Client, Chef)
Ctrl -> Model: AjouterChantier(...)
Model -> DB: VerifierChantier(code)
DB --> Model: res2 (code existe ?)

alt Données valides (dateDebut < DateFin et code inexistant)
    Model -> DB: Enregistrer(New Chantier())
    DB --> Model: Succès
    Model --> Ctrl: Succès
    Ctrl --> UI: Confirmation
    UI --> Dir: Afficher("Project Created successfully")
else Donnée invalide (dateDebut >= DateFin)
    Model --> Ctrl: Erreur dates
    Ctrl --> UI: AfficherErreur()
    UI --> Dir: Afficher("project end date must be greater than or equal to start date")
else Donnée invalide (code déjà existant)
    Model --> Ctrl: Erreur code dupliqué
    Ctrl --> UI: AfficherErreur()
    UI --> Dir: Afficher("Code already exists")
else Autre donnée invalide
    Model --> Ctrl: Erreur générique
    Ctrl --> UI: AfficherErreur()
    UI --> Dir: Afficher("Invalid input")
end

@enduml