# Annexes — Captures d'écran des tests unitaires

Ce fichier contient des placeholders d'images et les légendes prêtes à coller dans ton rapport. Remplace `images/<FILENAME>.png` par les chemins réels de tes captures.

## Instructions
- Taille recommandée : 1920×1080 ou ratio 16:9.
- Nommer les fichiers exactement comme indiqué et placer les images dans un dossier `images/` (ou adapter les chemins ci‑dessous).
- Ajouter éventuellement une annotation (flèche/encadré) sur chaque image pour pointer l'assertion clé.

---

## Auth (AuthenticationService)

### Fig_Auth_Register_Code.png
![Fig_Auth_Register_Code.png](images/Fig_Auth_Register_Code.png)
Légende : Test XUnit `Register_ReturnsAuthResponse_OnSuccess` montrant le setup des mocks et assertions.

### Fig_Auth_Register_TestExplorer.png
![Fig_Auth_Register_TestExplorer.png](images/Fig_Auth_Register_TestExplorer.png)
Légende : Test XUnit `Register_ReturnsAuthResponse_OnSuccess` — statut Passed dans Test Explorer.

### Fig_Auth_Register_DotnetTest.png
![Fig_Auth_Register_DotnetTest.png](images/Fig_Auth_Register_DotnetTest.png)
Légende : Sortie `dotnet test` confirmant l'exécution et le succès du test d'enregistrement.

### Fig_Auth_Login_Code.png
![Fig_Auth_Login_Code.png](images/Fig_Auth_Login_Code.png)
Légende : Test XUnit `Login_ReturnsAuthResponse_OnSuccess` vérifiant la connexion valide et la génération des tokens.

### Fig_Auth_Login_InvalidPass_Test.png
![Fig_Auth_Login_InvalidPass_Test.png](images/Fig_Auth_Login_InvalidPass_Test.png)
Légende : Test XUnit `Login_Throws_OnInvalidPassword` montrant l'assertion d'exception et la vérification de `FailedLoginAttempts`.

---

## JWT (JwtTokenService)

### Fig_Jwt_PasswordReset_Code.png
![Fig_Jwt_PasswordReset_Code.png](images/Fig_Jwt_PasswordReset_Code.png)
Légende : Test de génération/validation du token de réinitialisation.

### Fig_Jwt_GenerateValidate_Code.png
![Fig_Jwt_GenerateValidate_Code.png](images/Fig_Jwt_GenerateValidate_Code.png)
Légende : Test vérifiant que le token d'accès contient le claim `NameIdentifier` et que `ValidateToken` retourne l'ID.

### Fig_Jwt_DotnetTest.png
![Fig_Jwt_DotnetTest.png](images/Fig_Jwt_DotnetTest.png)
Légende : Sortie `dotnet test` pour la suite JWT — Passed.

---

## Project

### Fig_Project_PMNotFound_Code.png
![Fig_Project_PMNotFound_Code.png](images/Fig_Project_PMNotFound_Code.png)
Légende : Test d’échec `CreateProject_Throws_WhenProjectManagerNotFound`.

### Fig_Project_Handler_Code.png
![Fig_Project_Handler_Code.png](images/Fig_Project_Handler_Code.png)
Légende : Extrait de `CreateProjectCommandHandler` montrant la vérification d'existence du ProjectManager.

### Fig_Project_DotnetTest.png
![Fig_Project_DotnetTest.png](images/Fig_Project_DotnetTest.png)
Légende : Sortie `dotnet test` — Project test Passed.

---

## Sprint

### Fig_Sprint_Create_Code.png
![Fig_Sprint_Create_Code.png](images/Fig_Sprint_Create_Code.png)
Légende : Test de création de sprint (success case).

### Fig_Sprint_Create_Failure_Code.png
![Fig_Sprint_Create_Failure_Code.png](images/Fig_Sprint_Create_Failure_Code.png)
Légende : Test vérifiant l'exception si le projet n'existe pas.

### Fig_Sprint_Sync_Code.png
![Fig_Sprint_Sync_Code.png](images/Fig_Sprint_Sync_Code.png)
Légende : Extrait du synchronizer d'état `SprintStateSynchronizer`.

### Fig_Sprint_DotnetTest.png
![Fig_Sprint_DotnetTest.png](images/Fig_Sprint_DotnetTest.png)
Légende : Sortie `dotnet test` — Sprint tests Passed.

---

## Task

### Fig_Task_Create_Code.png
![Fig_Task_Create_Code.png](images/Fig_Task_Create_Code.png)
Légende : Test de création de tâche, seed de `UserStory` et assertions.

### Fig_Task_SprintId_Code.png
![Fig_Task_SprintId_Code.png](images/Fig_Task_SprintId_Code.png)
Légende : Test vérifiant que `SprintId` est correctement persistant.

### Fig_Task_Handler_Code.png
![Fig_Task_Handler_Code.png](images/Fig_Task_Handler_Code.png)
Légende : Handler de création de tâche et appel au synchronizer.

### Fig_Task_DotnetTest.png
![Fig_Task_DotnetTest.png](images/Fig_Task_DotnetTest.png)
Légende : Sortie `dotnet test` — Task tests Passed.

---

## UserStory

### Fig_UserStory_Create_Code.png
![Fig_UserStory_Create_Code.png](images/Fig_UserStory_Create_Code.png)
Légende : Test de création de `UserStory` avec seeds `Project` et `Sprint`.

### Fig_UserStory_Failure_Code.png
![Fig_UserStory_Failure_Code.png](images/Fig_UserStory_Failure_Code.png)
Légende : Tests d'échec pour `CreateUserStory` (sprint manquant / user assigné manquant).

### Fig_UserStory_Handler_Code.png
![Fig_UserStory_Handler_Code.png](images/Fig_UserStory_Handler_Code.png)
Légende : Handler montrant les `FindAsync` et validations avant création.

### Fig_UserStory_DotnetTest.png
![Fig_UserStory_DotnetTest.png](images/Fig_UserStory_DotnetTest.png)
Légende : Sortie `dotnet test` — UserStory tests Passed.

---

## Team

### Fig_Team_Create_Code.png
![Fig_Team_Create_Code.png](images/Fig_Team_Create_Code.png)
Légende : Test de création d'équipe lorsque le service existe.

### Fig_Team_Create_Failure_Code.png
![Fig_Team_Create_Failure_Code.png](images/Fig_Team_Create_Failure_Code.png)
Légende : Test d'échec si le service référencé est absent.

### Fig_Team_Handler_Code.png
![Fig_Team_Handler_Code.png](images/Fig_Team_Handler_Code.png)
Légende : Handler vérifiant l'existence du `Service` avant création.

### Fig_Team_DotnetTest.png
![Fig_Team_DotnetTest.png](images/Fig_Team_DotnetTest.png)
Légende : Sortie `dotnet test` — Team tests Passed.

---

## User (Model)

### Fig_UserModel_Code.png
![Fig_UserModel_Code.png](images/Fig_UserModel_Code.png)
Légende : Tests unitaires sur `IncrementFailedLoginAttempts` et `UpdateLastLogin`.

### Fig_User_Model_Code.png
![Fig_User_Model_Code.png](images/Fig_User_Model_Code.png)
Légende : Extrait du modèle `User` montrant les méthodes testées (`IsLockedOut`, `IncrementFailedLoginAttempts`).

### Fig_UserModel_DotnetTest.png
![Fig_UserModel_DotnetTest.png](images/Fig_UserModel_DotnetTest.png)
Légende : Sortie `dotnet test` — User model tests Passed.

---

## Code corrections (before/after)

### Fig_JwtService_Before.png
![Fig_JwtService_Before.png](images/Fig_JwtService_Before.png)
Légende : Extrait du code `JwtTokenService` avant correction (comparaison d'algorithme/claim type).

### Fig_JwtService_After.png
![Fig_JwtService_After.png](images/Fig_JwtService_After.png)
Légende : Extrait après correction — utilisation de `SecurityAlgorithms.HmacSha256Signature` et `ClaimTypes.NameIdentifier`.

---

## Résumé global

### Fig_All_DotnetTest_Summary.png
![Fig_All_DotnetTest_Summary.png](images/Fig_All_DotnetTest_Summary.png)
Légende : Résumé `dotnet test` pour l'ensemble de la suite (total, passed, failed).

### Fig_All_TestExplorer.png
![Fig_All_TestExplorer.png](images/Fig_All_TestExplorer.png)
Légende : Vue d'ensemble des tests dans Test Explorer — tous Passed.

### Fig_Coverage_Report.png (optionnel)
![Fig_Coverage_Report.png](images/Fig_Coverage_Report.png)
Légende : Rapport de couverture (si `coverlet` ou autre utilisé).

---

Fin du fichier.
