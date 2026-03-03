import { CommonModule } from '@angular/common';
import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { CreateServiceDto, Service, ServiceService } from '../../Page/Team/Service/ServiceService';
import { TokenService } from '../../Auth/Service/token.service';
import { Team as TeamEntity, TeamService, TeamUser } from '../../Page/Team/Service/TeamService';
import { ProjectService, project as ProjectEntity } from '../../Page/Projet/Service/ProjectService';
import { SprintService } from '../../Page/Sprint/Service/SprintService';

interface TeamMemberRow {
  fullName: string;
  email: string;
  roleLabel: string;
  roleClass: string;
  activeTasks: number;
  completedTasks: number;
  avatar: string;
  subtitle?: string;
}

@Component({
  selector: 'app-responsable-service-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './responsable-service-dashboard.html',
  styleUrl: './responsable-service-dashboard.css',
})
export class ResponsableServiceDashboard implements OnInit {
  private serviceApi = inject(ServiceService);
  private teamService = inject(TeamService);
  private projectService = inject(ProjectService);
  private sprintService = inject(SprintService);
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private cdr = inject(ChangeDetectorRef);

  activeSection: 'services' | 'calendar' = 'services';
  serviceViewMode: 'list' | 'detail' = 'list';
  activeTab: 'dashboard' | 'team' = 'dashboard';

  loading = false;
  error = '';
  searchTerm = '';
  statusFilter: 'all' | 'active' = 'all';

  services: Service[] = [];
  serviceTeams: TeamEntity[] = [];
  allProjects: ProjectEntity[] = [];
  selectedServiceMemberIds = new Set<number>();
  selectedServiceMembers: TeamUser[] = [];
  selectedServiceId: number | null = null;

  showCreateModal = false;
  newService: CreateServiceDto = {
    name: ''
  };

  currentDateLabel = '';
  userName = '';
  userRole = '';
  notificationCount = 0;
  currentMonth = new Date();
  calendarDays: Array<{ day: number; isToday: boolean; inCurrentMonth: boolean }> = [];

  get teamRows(): TeamMemberRow[] {
    if (!this.selectedService || this.selectedServiceMembers.length === 0) {
      return [];
    }

    return this.selectedServiceMembers.map((member) => {
      const memberUser = member.user;
      const isManager = this.selectedService?.responsibleId === member.userId;
      const roleValue = member.role;
      const firstName = memberUser?.firstName ?? 'Member';
      const lastName = memberUser?.lastName ?? String(member.userId ?? '');
      const fullName = `${firstName} ${lastName}`.trim();

      return {
        fullName,
        email: memberUser?.email ?? '—',
        roleLabel: this.getRoleLabel(roleValue, isManager),
        roleClass: this.getRoleClass(roleValue, isManager),
        activeTasks: 0,
        completedTasks: 0,
        avatar: this.getInitials(fullName),
        subtitle: isManager ? 'Chef de service' : undefined
      };
    });
  }

  get completedTasksCount(): number {
    return this.teamRows.reduce((sum, row) => sum + row.completedTasks, 0);
  }

  get activeTasksCount(): number {
    return this.teamRows.reduce((sum, row) => sum + row.activeTasks, 0);
  }

  get globalProgressPercent(): number {
    const total = this.completedTasksCount + this.activeTasksCount;
    if (total === 0) return 0;
    return Math.round((this.completedTasksCount / total) * 100);
  }

  get userStoryTotal(): number {
    return 0;
  }

  get sprintTotal(): number {
    return 0;
  }

  get activeSprintCount(): number {
    return 0;
  }

  get completedSprintCount(): number {
    return 0;
  }

  get completedUserStoriesCount(): number {
    return 0;
  }

  get inProgressUserStoriesCount(): number {
    return 0;
  }

  get todoTasksCount(): number {
    return 0;
  }

  ngOnInit(): void {
    if (!this.tokenService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.setUserProfile();
    this.setCurrentDate();
    this.generateCalendar();
    this.loadServices();
  }

  get pageTitle(): string {
    if (this.activeSection === 'calendar') return 'Calendrier';
    if (this.serviceViewMode === 'detail') return 'Mon Service';
    return 'Gestion des Services';
  }

  get selectedService(): Service | null {
    if (!this.selectedServiceId) return null;
    return this.services.find(service => service.id === this.selectedServiceId) ?? null;
  }

  get filteredServices(): Service[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.services.filter(service => {
      const matchesTerm = !term || service.name.toLowerCase().includes(term);
      const matchesStatus = this.statusFilter === 'all' || this.getServiceStatus(service) === 'Actif';
      return matchesTerm && matchesStatus;
    });
  }

  get membersCount(): number {
    if (this.selectedServiceMemberIds.size > 0) {
      return this.selectedServiceMemberIds.size;
    }
    return 0;
  }

  get selectedServiceTeams(): TeamEntity[] {
    if (!this.selectedServiceId) {
      return [];
    }

    return this.serviceTeams.filter((team) => this.getTeamServiceId(team) === this.selectedServiceId);
  }

  get teamsCount(): number {
    if (this.selectedServiceTeams.length > 0) {
      return this.selectedServiceTeams.length;
    }
    return 0;
  }

  get projectsCount(): number {
    if (this.selectedServiceProjects.length > 0) {
      return this.selectedServiceProjects.length;
    }
    return 0;
  }

  get selectedServiceProjects(): ProjectEntity[] {
    if (!this.selectedServiceId) {
      return [];
    }

    return this.allProjects.filter((project) => this.getProjectServiceId(project) === this.selectedServiceId);
  }

  loadServices(): void {
    this.loading = true;
    this.error = '';

    this.serviceApi.getServices()
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (data: Service[]) => {
          this.services = data ?? [];
          if (this.services.length > 0 && !this.selectedServiceId) {
            this.selectedServiceId = this.services[0].id;
            this.serviceViewMode = 'detail';
          }
          this.loadTeams();
          this.loadProjects();
        },
        error: () => {
          this.error = 'Impossible de charger les services. Vérifiez que le backend est démarré.';
          this.services = [];
        }
      });
  }

  setSection(section: 'services' | 'calendar'): void {
    this.activeSection = section;
    if (section === 'services') {
      this.serviceViewMode = this.selectedServiceId ? 'detail' : 'list';
    }
  }

  openServiceDetails(service: Service): void {
    this.selectedServiceId = service.id;
    this.serviceViewMode = 'detail';
    this.activeSection = 'services';
    this.activeTab = 'dashboard';
    this.loadMembersForSelectedService();
    this.loadTeams();
  }

  backToServiceList(): void {
    this.serviceViewMode = 'list';
    this.selectedServiceId = null;
    this.selectedServiceMemberIds = new Set<number>();
  }

  setTab(tab: 'dashboard' | 'team'): void {
    this.activeTab = tab;
  }

  openCreateServiceModal(): void {
    this.newService = { name: '' };
    this.showCreateModal = true;
  }

  closeCreateServiceModal(): void {
    this.showCreateModal = false;
  }

  createService(): void {
    if (!this.newService.name.trim()) {
      this.error = 'Le nom du service est obligatoire';
      return;
    }

    this.serviceApi.createService(this.newService).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loadServices();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de créer le service';
      }
    });
  }

  openProjects(): void {
    this.router.navigate(['/ProjectManage'], {
      queryParams: {
        serviceId: this.selectedServiceId ?? undefined
      }
    });
  }

  openProjectEdit(): void {
    this.router.navigate(['/ProjectManage'], {
      queryParams: {
        serviceId: this.selectedServiceId ?? undefined,
        source: 'service-manager'
      }
    });
  }

  openAddMembers(): void {
    this.router.navigate(['/TeamManage'], {
      queryParams: {
        serviceId: this.selectedServiceId ?? undefined,
        source: 'service-manager'
      }
    });
  }

  openCreateTeam(): void {
    this.router.navigate(['/TeamManage'], {
      queryParams: {
        serviceId: this.selectedServiceId ?? undefined,
        source: 'service-manager',
        action: 'create-team'
      }
    });
  }

  openTeams(): void {
    this.router.navigate(['/TeamManage'], {
      queryParams: {
        serviceId: this.selectedServiceId ?? undefined
      }
    });
  }

  openUserStories(): void {
    this.error = '';

    const firstProjectId = this.selectedServiceProjects[0]?.id;
    if (!firstProjectId) {
      this.error = 'Ajoutez un projet à ce service pour gérer les user stories.';
      return;
    }

    this.loading = true;
    this.sprintService.getSprintsByProjectId(firstProjectId)
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading = false;
            this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (sprints) => {
          const firstSprintId = sprints?.[0]?.id;
          if (firstSprintId) {
            this.router.navigate(['/UserStoryManage', firstSprintId]);
              this.cdr.detectChanges();
            return;
          }

          this.error = 'Aucun sprint trouvé. Créez un sprint pour gérer les user stories.';
          this.router.navigate(['/SprintManage', firstProjectId], {
            queryParams: { source: 'service-manager' }
          });
        },
        error: () => {
          this.error = 'Impossible de charger les sprints du projet.';
            this.cdr.detectChanges();
        }
      });
  }

  logout(): void {
    this.tokenService.clear();
    this.router.navigate(['/login']);
  }

  getServiceStatus(_service: Service): 'Actif' {
    return 'Actif';
  }

  getServiceAvatars(service: Service): string[] {
    if (this.selectedServiceId === service.id && this.teamRows.length > 0) {
      return this.teamRows.slice(0, 3).map((row) => row.avatar);
    }

    return [this.getInitials(service.name)];
  }

  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getServiceProjectsCount(service: Service): number {
    const serviceId = service.id;
    if (!serviceId) {
      return 0;
    }

    const filteredCount = this.allProjects.filter((project) => this.getProjectServiceId(project) === serviceId).length;
    if (filteredCount > 0) {
      return filteredCount;
    }

    return 0;
  }

  getMembersCountForService(service: Service): number {
    if (!service?.id) {
      return 0;
    }

    if (this.selectedServiceId === service.id && this.selectedServiceMemberIds.size > 0) {
      return this.selectedServiceMemberIds.size;
    }

    const teamIds = this.serviceTeams
      .filter((team) => this.getTeamServiceId(team) === service.id)
      .map((team) => team.id);

    if (teamIds.length === 0) {
      return 0;
    }

    return this.selectedServiceMembers.filter((member) => teamIds.includes(member.teamId)).length;
  }

  getResponsibleLabel(service: Service): string {
    if (!service?.responsibleId) {
      return 'Non assigné';
    }

    const manager = this.selectedServiceMembers.find((member) => member.userId === service.responsibleId)?.user;
    if (manager) {
      return `${manager.firstName} ${manager.lastName}`.trim();
    }

    return `User #${service.responsibleId}`;
  }

  private getRoleLabel(role: unknown, isManager: boolean): string {
    if (typeof role === 'number') {
      if (role === 0) return 'Administrateur';
      if (role === 1) return 'Service Manager';
      if (role === 2) return 'Chef de projet';
      if (role === 3) return 'Employé';
    }
    if (typeof role === 'string' && role.trim().length > 0) {
      return role;
    }
    return isManager ? 'Manager' : 'Employé';
  }

  private getRoleClass(role: unknown, isManager: boolean): string {
    if (typeof role === 'number') {
      if (role === 0) return 'role-admin';
      if (role === 1) return 'role-manager';
      if (role === 2) return 'role-lead';
      if (role === 3) return 'role-employee';
    }
    return isManager ? 'role-manager' : 'role-employee';
  }

  private toNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private setCurrentDate(): void {
    this.currentDateLabel = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  private setUserProfile(): void {
    const userData = this.tokenService.getUserData();
    if (userData?.firstName && userData?.lastName) {
      this.userName = `${userData.firstName} ${userData.lastName}`;
    } else {
      this.userName = '—';
    }
    if (userData?.role) {
      this.userRole = userData.role;
    } else {
      this.userRole = '—';
    }
  }

  private generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const today = new Date();
    this.calendarDays = [];

    for (let index = 0; index < totalCells; index++) {
      const dayNumber = index - startOffset + 1;
      const inCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
      const isToday = inCurrentMonth && dayNumber === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      this.calendarDays.push({
        day: inCurrentMonth ? dayNumber : 0,
        isToday,
        inCurrentMonth
      });
    }
  }

  private loadTeams(): void {
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        this.serviceTeams = teams ?? [];
        this.loadMembersForSelectedService();
      },
      error: () => {
        this.serviceTeams = [];
        this.selectedServiceMemberIds = new Set<number>();
      }
    });
  }

  private loadMembersForSelectedService(): void {
    const teams = this.selectedServiceTeams;
    if (teams.length === 0) {
      this.selectedServiceMemberIds = new Set<number>();
      return;
    }

    const membersRequests = teams.map((team) =>
      this.teamService
        .getMembersByTeamId(team.id)
        .pipe(catchError(() => of([] as TeamUser[])))
    );

    forkJoin(membersRequests).subscribe({
      next: (membersByTeam) => {
        const ids = new Set<number>();
        const members: TeamUser[] = [];
        membersByTeam.forEach((members) => {
          members.forEach((member) => {
            if (typeof member.userId === 'number') {
              ids.add(member.userId);
            }
            members.push(member);
          });
        });
        this.selectedServiceMemberIds = ids;
        this.selectedServiceMembers = members;
      },
      error: () => {
        this.selectedServiceMemberIds = new Set<number>();
        this.selectedServiceMembers = [];
      }
    });
  }

  private loadProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.allProjects = projects ?? [];
      },
      error: () => {
        this.allProjects = [];
      }
    });
  }

  private getProjectServiceId(project: ProjectEntity): number | null {
    const typedProject = project as ProjectEntity & { ServiceId?: number; serviceID?: number };
    const serviceIdValue = typedProject.serviceId ?? typedProject.ServiceId ?? typedProject.serviceID;
    return typeof serviceIdValue === 'number' && Number.isFinite(serviceIdValue) ? serviceIdValue : null;
  }

  private getTeamServiceId(team: TeamEntity): number | null {
    const typedTeam = team as TeamEntity & { ServiceId?: number; serviceID?: number };
    const serviceIdValue = typedTeam.serviceId ?? typedTeam.ServiceId ?? typedTeam.serviceID;
    return typeof serviceIdValue === 'number' && Number.isFinite(serviceIdValue) ? serviceIdValue : null;
  }

}