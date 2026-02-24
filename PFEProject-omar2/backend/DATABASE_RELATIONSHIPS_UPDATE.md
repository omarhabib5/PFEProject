# Database Relationships Update Summary

## ✅ What Was Updated

### 1. **User Model** (`Projet.Domain\Model\User.cs`)
Added the following properties and relationships:
- `Serviceid` (int?) - Foreign key to Service (nullable, employee can belong to a service)
- `Service` - Navigation property to the Service the user belongs to
- `ManagedServices` - Collection of Services the user manages (as Responsible)

**Complete User Relationships:**
```
User (Employee/Manager)
├── Service (belongs to) - Many-to-One
├── ManagedServices (manages) - One-to-Many
├── ManagedProjects (manages) - One-to-Many
├── AssignedTasks (assigned to) - One-to-Many
├── TeamUsers (member of teams) - One-to-Many
└── RefreshTokens (auth tokens) - One-to-Many
```

### 2. **Service Model** (`Projet.Domain\Model\Service.cs`)
Already had these relationships (no changes needed):
- `ResponsibleId` - Foreign key to User (Service Manager)
- `Responsible` - Navigation property to User (Service Manager)
- `Members` - Collection of Users who belong to this service
- `Teams` - Collection of Teams in this service
- `Projects` - Collection of Projects in this service

**Complete Service Relationships:**
```
Service
├── Responsible (service manager) - Many-to-One
├── Members (employees) - One-to-Many
├── Teams - One-to-Many
└── Projects - One-to-Many
```

### 3. **Team Model** (`Projet.Domain\Model\Team.cs`)
Already had relationship with Service (verified):
- `ServiceId` - Foreign key to Service
- `Service` - Navigation property to Service

**Complete Team Relationships:**
```
Team
├── Service (belongs to) - Many-to-One
├── TeamUsers (members) - One-to-Many
└── Projects - One-to-Many
```

### 4. **ApplicationDbContext** Configuration
Updated entity configurations for:

**User Entity:**
```csharp
- User.Service → Service.Members (Many-to-One with SetNull on delete)
- User.ManagedServices → Service.Responsible (One-to-Many with SetNull on delete)
- User.ManagedProjects → Project.ProjectManager (One-to-Many with Restrict)
- User.AssignedTasks → Task.AssignedTo (One-to-Many with Restrict)
- User.RefreshTokens → RefreshToken.User (One-to-Many with Cascade)
```

**Service Entity:**
```csharp
- Service.Responsible → User.ManagedServices (configured via User entity)
- Service.Members → User.Service (configured via User entity)
```

**Team Entity:**
```csharp
- Team.Service → Service.Teams (Many-to-One with Restrict)
```

## 📊 Complete Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                     Database Relationships                    │
└─────────────────────────────────────────────────────────────┘

Service
├── ResponsibleId → User (ServiceManager)
│   └── Responsible: User
├── Members → [Users] (Employees in service)
├── Teams → [Teams] (Teams in service)
└── Projects → [Projects] (Projects in service)

User
├── Serviceid → Service (Employee belongs to service)
│   └── Service: Service
├── ManagedServices → [Services] (Services managed by user)
├── ManagedProjects → [Projects] (Projects managed by user)
├── AssignedTasks → [Tasks] (Tasks assigned to user)
├── TeamUsers → [TeamUsers] (Team memberships)
└── RefreshTokens → [RefreshTokens] (Auth tokens)

Team
├── ServiceId → Service
│   └── Service: Service
├── TeamUsers → [TeamUsers]
└── Projects → [Projects]

Project
├── ServiceId → Service
├── TeamId → Team
├── ProjectManagerId → User
├── Sprints → [Sprints]
└── UserStories → [UserStories]

Task
├── AssignedToId → User
├── UserStoryId → UserStory
└── SprintId → Sprint
```

## 🔄 Delete Behaviors

| Relationship | Delete Behavior | Description |
|-------------|----------------|-------------|
| User → Service (Member) | SetNull | If service is deleted, user's Serviceid becomes null |
| User → Service (Responsible) | SetNull | If user is deleted, service's ResponsibleId becomes null |
| Service → Team | Restrict | Cannot delete service if it has teams |
| User → Project (Manager) | Restrict | Cannot delete user if they manage projects |
| User → Task (Assigned) | Restrict | Cannot delete user if they have assigned tasks |
| User → RefreshToken | Cascade | If user is deleted, all their tokens are deleted |

## ✅ Migration Applied

**Migration Name:** `20260215103617_AddUserServiceRelationships`

**Changes:**
- Updated Foreign Key constraints for User-Service relationship
- Updated Foreign Key constraints for Team-Service relationship
- Set proper delete behaviors (SetNull, Restrict, Cascade)

## 🧪 Testing the Relationships

### Create Service with Responsible
```csharp
POST /api/service
{
  "name": "IT Department"
}
```

### Create Employee and Assign to Service
```csharp
POST /api/auth/create-employee
{
  "email": "employee@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "serviceId": 1  // Assigns to IT Department
}
```

### Update User's Service
```csharp
PUT /api/user/1
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@company.com",
  "role": "Employee",
  "serviceId": 2  // Move to different service
}
```

## 📝 Notes

1. **Service-User Relationship:**
   - A User can belong to ONE Service (as a member)
   - A User can manage MULTIPLE Services (as Responsible)
   - A Service can have ONE Responsible (manager)
   - A Service can have MULTIPLE Members (employees)

2. **Nullable Foreign Keys:**
   - `User.Serviceid` is nullable - employees don't have to belong to a service
   - `Service.ResponsibleId` is nullable - services don't require a manager

3. **Circular Reference Handling:**
   - Program.cs configured with `ReferenceHandler.IgnoreCycles` to prevent JSON serialization issues

## ✨ Benefits

✅ **Proper data integrity** with foreign key constraints
✅ **Referential integrity** with appropriate delete behaviors
✅ **Flexible employee assignment** to services
✅ **Service management hierarchy** (responsible/manager)
✅ **Prevents orphaned records** with cascade/restrict rules
✅ **Service-based team organization**

All relationships are now properly configured in the database! 🎉
