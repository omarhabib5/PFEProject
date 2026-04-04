import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamService, Team, TeamUser, CreateTeamRequest, UpdateTeamRequest, AddMemberRequest, Role, UserInTeam } from '../Service/TeamService';
import { ServiceService, Service } from '../Service/ServiceService';
import { UserApiService, UserDto } from '../Service/UserApiService';
import { TokenService } from '../../../Auth/Service/token.service';
import { AppRole } from '../../../Auth/model/auth.model';

@Component({
  selector: 'app-team-manage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-manage.html',
  styleUrl: './team-manage.css',
})
export class TeamManage implements OnInit {
  private router = inject(Router);
  private teamService = inject(TeamService);
  private serviceService = inject(ServiceService);
  private userApiService = inject(UserApiService);
  private tokenService = inject(TokenService);
  private cdr = inject(ChangeDetectorRef); 

  
  teams: Team[] = [];
  selectedTeam: Team | null = null;
  teamMembers: TeamUser[] = [];
  
  
  services: Service[] = [];
  users: UserDto[] = [];
  employeeUsers: UserDto[] = [];

  showCreateTeamForm = false;
  isEditMode = false;
  editingTeamId: number | null = null;
  newTeam: CreateTeamRequest = {
    name: '',
    serviceId: 0
  };

  showAddMemberForm = false;
  newMember: AddMemberRequest = {
    userId: 0,
    role: Role.Employer
  };


  memberFilter: 'all' | 'leaders' | 'employees' = 'all';
  
 
  editingMemberId: number | null = null;
  editMemberRole: Role = Role.Employer;

  Role = Role;

  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  showBackToDashboardButton = false;

  ngOnInit(): void {
    this.showBackToDashboardButton = this.tokenService.getUserRole() === AppRole.ServiceManager;
    this.loadTeams();
    this.loadServices();
    this.loadUsers();
  }

  loadServices(): void {
    this.serviceService.getServices().subscribe({
      next: (data) => {
        this.services = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading services:', err);
      }
    });
  }

  loadUsers(): void {
    this.userApiService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.employeeUsers = data.filter((user) => this.isEmployeeUser(user));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

  getServiceName(serviceId?: number): string {
    if (!serviceId) return 'N/A';
    const service = this.services.find(s => s.id === serviceId);
    return service ? service.name : `Service ${serviceId}`;
  }

  getUserFullName(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : `User ${userId}`;
  }

  private isEmployeeUser(user: UserDto): boolean {
    const role = user.role;

    if (typeof role === 'number') {
      return role === 3;
    }

    const normalized = String(role ?? '').trim().toLowerCase();
    return normalized === 'employee'
      || normalized === 'employer'
      || normalized === '3'
      || normalized === 'role.employee';
  }

  hasProjectLeader(memberIdToIgnore?: number): boolean {
    return this.teamMembers.some((member) =>
      member.role === Role.ProjectLeader && member.id !== memberIdToIgnore
    );
  }

  canAssignProjectLeader(memberIdToIgnore?: number): boolean {
    return !this.hasProjectLeader(memberIdToIgnore);
  }
  get availableUsersForTeam(): UserDto[] {
    const currentMemberIds = new Set(this.teamMembers.map((member) => Number(member.userId)));
    return this.employeeUsers.filter((user) => {
      const alreadyInTeam = currentMemberIds.has(Number(user.id));
      return !alreadyInTeam;
    });
  }

  getUserRoleDisplay(role: string | number | undefined): string {
    const normalized = String(role ?? '').trim().toLowerCase();
    if (normalized === '0' || normalized === 'admin') return 'Admin';
    if (normalized === '1' || normalized === 'servicemanager' || normalized === 'service manager') return 'Team Manager';
    if (normalized === '2' || normalized === 'projectmanager' || normalized === 'project manager') return 'Project Manager';
    if (normalized === '3' || normalized === 'employee' || normalized === 'employe') return 'Employee';
    return normalized ? String(role) : 'Employee';
  }

  getMemberUserRole(member: TeamUser): string {
    const directRole = (member.user as { role?: string | number } | undefined)?.role;
    if (directRole !== undefined && directRole !== null) {
      return this.getUserRoleDisplay(directRole);
    }

    const user = this.users.find((item) => Number(item.id) === Number(member.userId));
    return this.getUserRoleDisplay(user?.role);

  }

  loadTeams(): void {
    this.loading = true;
    this.error = null;
    
    this.teamService.getTeams().subscribe({
      next: (data) => {
        this.teams = data;
        this.loading = false;
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        this.error = 'Failed to load teams: ' + (err.error?.message || err.message);
        this.loading = false;
        console.error('Error loading teams:', err);
        this.cdr.detectChanges();
      }
    });
  }

  loadTeamMembers(teamId: number): void {
    this.loading = true;
    this.error = null;
    
    let memberObservable;
    
    if (this.memberFilter === 'leaders') {
      memberObservable = this.teamService.getLeadersByTeamId(teamId);
    } else if (this.memberFilter === 'employees') {
      memberObservable = this.teamService.getEmployeesByTeamId(teamId);
    } else {
      memberObservable = this.teamService.getMembersByTeamId(teamId);
    }
    
    memberObservable.subscribe({
      next: (data) => {
        this.teamMembers = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load members: ' + (err.error?.message || err.message);
        this.loading = false;
        console.error('Error loading members:', err);
        this.cdr.detectChanges();
      }
    });
  }

  filterMembers(filter: 'all' | 'leaders' | 'employees'): void {
    if (!this.selectedTeam) return;
    this.memberFilter = filter;
    this.loadTeamMembers(this.selectedTeam.id);
  }


  createTeam(): void {

    this.newTeam.name = this.newTeam.name?.trim() || '';
    
   
    if (!this.newTeam.name) {
      this.error = 'Team name is required';
      setTimeout(() => this.error = null, 5000);
      return;
    }
    
    if (!this.newTeam.serviceId || this.newTeam.serviceId === 0) {
      this.error = 'Please select a service';
      setTimeout(() => this.error = null, 5000);
      return;
    }

    this.loading = true;
    this.error = null;

    this.teamService.createTeam(this.newTeam).subscribe({
      next: (response) => {
        this.successMessage = 'Team created successfully!';
        this.showCreateTeamForm = false;
        this.resetNewTeamForm();
        this.loadTeams(); 
        this.loading = false;
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        this.error = 'Failed to create team: ' + (err.error?.message || err.message);
        this.loading = false;
        console.error('Error creating team:', err);
        this.cdr.detectChanges();
      }
    });
  }

  deleteTeam(teamId: number): void {
    if (!confirm('Are you sure you want to delete this team?')) {
      return;
    }

    
    const teamToDelete = this.teams.find(t => t.id === teamId);
    
   
    this.teams = this.teams.filter(t => t.id !== teamId);
    
    
    if (this.selectedTeam?.id === teamId) {
      this.selectedTeam = null;
      this.teamMembers = [];
    }
    
    this.cdr.detectChanges(); 

    this.loading = true;
    this.error = null;

    this.teamService.deleteTeam(teamId).subscribe({
      next: () => {
        this.successMessage = 'Team deleted successfully!';
        this.loading = false;
        setTimeout(() => this.successMessage = null, 3000);
        this.cdr.detectChanges();
      },
      error: (err) => {
      
        if (teamToDelete) {
          this.teams = [...this.teams, teamToDelete];
        }
        
        this.error = 'Failed to delete team: ' + (err.error?.message || err.message);
        this.loading = false;
        console.error('Error deleting team:', err);
        this.cdr.detectChanges();
      }
    });
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
    this.showAddMemberForm = false;
    this.memberFilter = 'all';
    this.editingMemberId = null;
    this.loadTeamMembers(team.id);
    this.cdr.detectChanges();
  }

 

  addMember(): void {
    if (!this.selectedTeam || this.newMember.userId === 0) {
      this.error = 'Please select a user';
      return;

    }

    if (this.newMember.role === Role.ProjectLeader && !this.canAssignProjectLeader()) {
      this.error = 'Only one project leader is allowed per team.';
      return;
    }

    const selectedUser = this.users.find(u => u.id === this.newMember.userId);
    if (selectedUser && !this.isEmployeeUser(selectedUser)) {
      this.error = 'Only users with Employee role can be added to a team.';
      return;
    }
    const tempMember: TeamUser = {
      id: -Date.now(), 
      userId: this.newMember.userId,
      teamId: this.selectedTeam.id,
      role: this.newMember.role,
   
      user: selectedUser ? { 
        id: this.newMember.userId,
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        email: selectedUser.email,
        role: this.toUserRoleNumber(selectedUser.role)
      } : undefined
    };

  
    this.teamMembers = [...this.teamMembers, tempMember];
    this.showAddMemberForm = false;
    this.cdr.detectChanges(); 

    this.loading = true;
    this.error = null;

    console.log('Adding member with data:', this.newMember);
    console.log('Role value:', this.newMember.role, 'Type:', typeof this.newMember.role);

    this.teamService.addMemberToTeam(this.selectedTeam.id, this.newMember).subscribe({
      next: (response) => {
     
        this.teamService.getMembersByTeamId(this.selectedTeam!.id).subscribe({
          next: (members) => {
            this.teamMembers = members;
            this.successMessage = 'Member added successfully!';
            this.resetNewMemberForm();
            this.loading = false;
            setTimeout(() => this.successMessage = null, 3000);
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.error = 'Failed to load members after adding: ' + (err.error?.message || err.message);
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
       
        this.teamMembers = this.teamMembers.filter(m => m.id !== tempMember.id);
        
        
        let errorMsg = 'Failed to add member';
        if (err.error?.message) {
          errorMsg = err.error.message;
        } else if (err.error?.title) {
          errorMsg = err.error.title;
        } else if (err.error?.errors) {
     
          const validationErrors = Object.values(err.error.errors).flat();
          errorMsg = validationErrors.join(', ');
        } else if (err.message) {
          errorMsg = err.message;
        }
        
        this.error = errorMsg;
        this.loading = false;
        console.error('Error adding member:', err);
        console.error('Error details:', err.error);
        this.cdr.detectChanges();
      }
    });
  }

  startEditMember(member: TeamUser): void {
    this.editingMemberId = member.id;
    this.editMemberRole = member.role;
    this.cdr.detectChanges();
  }

  cancelEditMember(): void {
    this.editingMemberId = null;
    this.cdr.detectChanges();
  }

  updateMemberRole(memberId: number): void {
    if (!this.selectedTeam) return;

    if (this.editMemberRole === Role.ProjectLeader && !this.canAssignProjectLeader(memberId)) {
      this.error = 'Only one project leader is allowed per team.';
      return;
    }

    this.loading = true;
    this.error = null;

    this.teamService.updateMemberRole(this.selectedTeam.id, memberId, this.editMemberRole).subscribe({
      next: () => {
        this.successMessage = 'Member role updated successfully!';
        this.editingMemberId = null;
        this.loadTeamMembers(this.selectedTeam!.id);
        this.loading = false;
        setTimeout(() => this.successMessage = null, 3000);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to update member role: ' + (err.error?.message || err.message);
        this.loading = false;
        console.error('Error updating member role:', err);
        this.cdr.detectChanges();
      }
    });
  }

  removeMember(memberId: number): void {
    if (!this.selectedTeam) return;
    
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    
    const memberToRemove = this.teamMembers.find(m => m.id === memberId);
    
  
    this.teamMembers = this.teamMembers.filter(m => m.id !== memberId);
    this.cdr.detectChanges(); 

    this.loading = true;
    this.error = null;

    this.teamService.removeMemberFromTeam(this.selectedTeam.id, memberId).subscribe({
      next: () => {
        this.successMessage = 'Member removed successfully!';
        this.loading = false;
        setTimeout(() => this.successMessage = null, 3000);
        this.cdr.detectChanges();
      },
      error: (err) => {
        
        if (memberToRemove) {
          this.teamMembers = [...this.teamMembers, memberToRemove];
        }
        
        this.error = 'Failed to remove member: ' + (err.error?.message || err.message);
        this.loading = false;
        console.error('Error removing member:', err);
        this.cdr.detectChanges();
      }
    });
  }

  startEditTeam(team: Team): void {
    this.isEditMode = true;
    this.editingTeamId = team.id;
    this.newTeam = {
      name: team.name,
      serviceId: team.serviceId || 0
    };
    this.showCreateTeamForm = true;
    this.cdr.detectChanges();
  }

  UpdateTeam(id: number): void {
  
  this.newTeam.name = this.newTeam.name?.trim() || '';
  
  if (!this.newTeam.name) {
    this.error = 'Team name is required';
    setTimeout(() => this.error = null, 5000);
    return;
  }
  
  if (!this.newTeam.serviceId || this.newTeam.serviceId === 0) {
    this.error = 'Please select a service';
    setTimeout(() => this.error = null, 5000);
    return;
  }

  this.loading = true;
  this.error = null;

  this.teamService.updateTeam(id, this.newTeam).subscribe({
    next: (response) => {
      this.successMessage = 'Team updated successfully!';
      this.showCreateTeamForm = false;
      this.isEditMode = false;
      this.editingTeamId = null;
      this.resetNewTeamForm();
      this.loadTeams(); 
      this.loading = false;
      setTimeout(() => this.successMessage = null, 3000);
      this.cdr.detectChanges();
    },
    error: (err) => {
      this.error = 'Failed to update team: ' + (err.error?.message || err.message);
      this.loading = false;
      console.error('Error updating team:', err);
      this.cdr.detectChanges();
    }
  });
}




  toggleCreateTeamForm(): void {
    this.showCreateTeamForm = !this.showCreateTeamForm;
    if (this.showCreateTeamForm) {
      this.resetNewTeamForm();
    } else {
      this.isEditMode = false;
      this.editingTeamId = null;
    }
  }

  toggleAddMemberForm(): void {
    this.showAddMemberForm = !this.showAddMemberForm;
    if (this.showAddMemberForm) {
      this.resetNewMemberForm();
    }
  }

  resetNewTeamForm(): void {
    this.newTeam = {
      name: '',
      serviceId: 0
    };
    this.isEditMode = false;
    this.editingTeamId = null;
  }

  resetNewMemberForm(): void {
    this.newMember = {
      userId: 0,
      role: Role.Employer
    };
  }

  getRoleName(role: Role): string {
    if (role === Role.Employer) return 'Employee';
    if (role === Role.ProjectLeader) return 'Project Leader';
    return 'Unknown Role';  
  }

  private isAdminRole(role: string | number | undefined): boolean {
    const normalized = String(role ?? '').trim().toLowerCase();
    return normalized === '0' || normalized === 'admin';
  }

  private toUserRoleNumber(role: string | number | undefined): number | undefined {
    if (typeof role === 'number' && Number.isFinite(role)) {
      return role;
    }

    const normalized = String(role ?? '').trim().toLowerCase();
    if (normalized === '0' || normalized === 'admin') return 0;
    if (normalized === '1' || normalized === 'servicemanager' || normalized === 'service manager') return 1;
    if (normalized === '2' || normalized === 'projectmanager' || normalized === 'project manager') return 2;
    if (normalized === '3' || normalized === 'employee' || normalized === 'employe') return 3;
    return undefined;
  }

  backToTeamsList(): void {
    this.selectedTeam = null;
    this.teamMembers = [];
    this.showAddMemberForm = false;
    this.memberFilter = 'all';
    this.editingMemberId = null;
    this.cdr.detectChanges();
  }

  goToDashboard(): void {
    const role = this.tokenService.getUserRole();

    if (role === AppRole.Admin) {
      this.router.navigate(['/AdminDashboard']);
      return;
    }

    if (role === AppRole.ServiceManager) {
      this.router.navigate(['/ResponsableServiceDashboard']);
      return;
    }

    if (role === AppRole.ProjectManager) {
      this.router.navigate(['/ChefProjetDashboard']);
      return;
    }

    if (role === AppRole.Employee) {
      this.router.navigate(['/EmployeeDashboard']);
      return;
    }

    this.router.navigate(['/login']);
  }

  
  trackByTeamId(index: number, team: Team): number {
    return team.id;
  }

  trackByMemberId(index: number, member: TeamUser): number {
    return member.id;
  }
}