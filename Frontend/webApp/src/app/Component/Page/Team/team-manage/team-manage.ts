import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Role, Team, TeamService, TeamUser } from '../Service/TeamService';
import { Service, ServiceService } from '../Service/ServiceService';
import { UserApiService, UserDto } from '../Service/UserApiService';

@Component({
  selector: 'app-team-manage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-manage.html',
  styleUrl: './team-manage.css',
})
export class TeamManage implements OnInit {
  teams: Team[] = [];
  services: Service[] = [];
  users: UserDto[] = [];
  teamMembers: TeamUser[] = [];
  allTeamMembers: TeamUser[] = [];

  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  selectedTeam: Team | null = null;
  showCreateTeamForm = false;
  showAddMemberForm = false;
  isEditMode = false;
  editingTeamId: number | null = null;

  memberFilter: 'all' | 'leaders' | 'employees' = 'all';
  editingMemberId: number | null = null;
  editMemberRole: Role = Role.Employer;

  Role = Role;

  newTeam = {
    name: '',
    serviceId: 0
  };

  newMember = {
    userId: 0,
    role: Role.Employer
  };

  constructor(
    private teamService: TeamService,
    private serviceService: ServiceService,
    private userApiService: UserApiService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading = true;
    this.error = null;

    this.teamService.getTeams().subscribe({
      next: (teams) => {
        this.teams = teams;
        this.serviceService.getServices().subscribe({
          next: (services) => {
            this.services = services;
            this.userApiService.getUsers().subscribe({
              next: (users) => {
                this.users = users;
                this.loading = false;
              },
              error: () => {
                this.error = 'Erreur lors du chargement des utilisateurs';
                this.loading = false;
              }
            });
          },
          error: () => {
            this.error = 'Erreur lors du chargement des services';
            this.loading = false;
          }
        });
      },
      error: () => {
        this.error = 'Erreur lors du chargement des équipes';
        this.loading = false;
      }
    });
  }

  toggleCreateTeamForm(): void {
    this.showCreateTeamForm = !this.showCreateTeamForm;
    if (!this.showCreateTeamForm) {
      this.isEditMode = false;
      this.editingTeamId = null;
      this.newTeam = { name: '', serviceId: 0 };
    }
  }

  createTeam(): void {
    if (!this.newTeam.name || !this.newTeam.serviceId) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }

    this.loading = true;
    this.teamService.createTeam(this.newTeam).subscribe({
      next: () => {
        this.successMessage = 'Équipe créée avec succès';
        this.showCreateTeamForm = false;
        this.newTeam = { name: '', serviceId: 0 };
        this.loadInitialData();
      },
      error: () => {
        this.error = 'Erreur lors de la création de l’équipe';
        this.loading = false;
      }
    });
  }

  UpdateTeam(teamId: number): void {
    if (!this.newTeam.name || !this.newTeam.serviceId) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }

    this.loading = true;
    this.teamService.updateTeam(teamId, this.newTeam).subscribe({
      next: () => {
        this.successMessage = 'Équipe mise à jour avec succès';
        this.showCreateTeamForm = false;
        this.isEditMode = false;
        this.editingTeamId = null;
        this.newTeam = { name: '', serviceId: 0 };
        this.loadInitialData();
      },
      error: () => {
        this.error = 'Erreur lors de la mise à jour de l’équipe';
        this.loading = false;
      }
    });
  }

  startEditTeam(team: Team): void {
    this.isEditMode = true;
    this.editingTeamId = team.id;
    this.showCreateTeamForm = true;
    this.newTeam = {
      name: team.name,
      serviceId: team.serviceId ?? 0
    };
  }

  deleteTeam(teamId: number): void {
    this.loading = true;
    this.teamService.deleteTeam(teamId).subscribe({
      next: () => {
        this.successMessage = 'Équipe supprimée avec succès';
        if (this.selectedTeam?.id === teamId) {
          this.selectedTeam = null;
          this.teamMembers = [];
          this.allTeamMembers = [];
        }
        this.loadInitialData();
      },
      error: () => {
        this.error = 'Erreur lors de la suppression de l’équipe';
        this.loading = false;
      }
    });
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
    this.showAddMemberForm = false;
    this.memberFilter = 'all';
    this.loadTeamMembers();
  }

  backToTeamsList(): void {
    this.selectedTeam = null;
    this.showAddMemberForm = false;
    this.editingMemberId = null;
    this.memberFilter = 'all';
  }

  loadTeamMembers(): void {
    if (!this.selectedTeam) return;

    this.loading = true;
    this.teamService.getMembersByTeamId(this.selectedTeam.id).subscribe({
      next: (members) => {
        this.allTeamMembers = members;
        this.teamMembers = members;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement des membres';
        this.loading = false;
      }
    });
  }

  toggleAddMemberForm(): void {
    this.showAddMemberForm = !this.showAddMemberForm;
    if (!this.showAddMemberForm) {
      this.newMember = { userId: 0, role: Role.Employer };
    }
  }

  addMember(): void {
    if (!this.selectedTeam) return;
    if (!this.newMember.userId) {
      this.error = 'Veuillez sélectionner un utilisateur';
      return;
    }

    this.loading = true;
    this.teamService.addMemberToTeam(this.selectedTeam.id, this.newMember).subscribe({
      next: () => {
        this.successMessage = 'Membre ajouté avec succès';
        this.showAddMemberForm = false;
        this.newMember = { userId: 0, role: Role.Employer };
        this.loadTeamMembers();
      },
      error: () => {
        this.error = 'Erreur lors de l’ajout du membre';
        this.loading = false;
      }
    });
  }

  filterMembers(filter: 'all' | 'leaders' | 'employees'): void {
    this.memberFilter = filter;
    if (!this.selectedTeam) return;

    this.loading = true;
    const request =
      filter === 'leaders'
        ? this.teamService.getLeadersByTeamId(this.selectedTeam.id)
        : filter === 'employees'
          ? this.teamService.getEmployeesByTeamId(this.selectedTeam.id)
          : this.teamService.getMembersByTeamId(this.selectedTeam.id);

    request.subscribe({
      next: (members) => {
        this.teamMembers = members;
        if (filter === 'all') {
          this.allTeamMembers = members;
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du filtrage des membres';
        this.loading = false;
      }
    });
  }

  startEditMember(member: TeamUser): void {
    this.editingMemberId = member.id;
    this.editMemberRole = member.role;
  }

  cancelEditMember(): void {
    this.editingMemberId = null;
    this.editMemberRole = Role.Employer;
  }

  updateMemberRole(memberId: number): void {
    if (!this.selectedTeam) return;

    this.loading = true;
    this.teamService.updateMemberRole(this.selectedTeam.id, memberId, this.editMemberRole).subscribe({
      next: () => {
        this.successMessage = 'Rôle mis à jour avec succès';
        this.editingMemberId = null;
        this.loadTeamMembers();
      },
      error: () => {
        this.error = 'Erreur lors de la mise à jour du rôle';
        this.loading = false;
      }
    });
  }

  removeMember(memberId: number): void {
    if (!this.selectedTeam) return;

    this.loading = true;
    this.teamService.removeMemberFromTeam(this.selectedTeam.id, memberId).subscribe({
      next: () => {
        this.successMessage = 'Membre supprimé avec succès';
        this.loadTeamMembers();
      },
      error: () => {
        this.error = 'Erreur lors de la suppression du membre';
        this.loading = false;
      }
    });
  }

  getServiceName(serviceId?: number): string {
    if (!serviceId) return 'N/A';
    return this.services.find(s => s.id === serviceId)?.name ?? 'N/A';
  }

  getUserFullName(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : `User #${userId}`;
  }

  getRoleName(role: Role): string {
    return role === Role.ProjectLeader ? 'Project Leader' : 'Employee';
  }

}
