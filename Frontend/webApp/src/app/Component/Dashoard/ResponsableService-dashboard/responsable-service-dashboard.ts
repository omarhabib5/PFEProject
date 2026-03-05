import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { TokenService } from '../../Auth/Service/token.service';
import { ProjectService, State as ProjectState, project as ProjectEntity } from '../../Page/Projet/Service/ProjectService';
import { Sprint, SprintService } from '../../Page/Sprint/Service/SprintService';
import { Team as TeamEntity, TeamService, TeamUser } from '../../Page/Team/Service/TeamService';
import { CreateServiceDto, Service, ServiceService } from '../../Page/Team/Service/ServiceService';
import { CreateUserStoryRequest, UserStoryDto, UserStoryStatus } from '../../Page/UserStory/Models/userstory.model';
import { UserStoryService } from '../../Page/UserStory/Service/UserStoryService';

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

interface ServiceUserStoryRow extends UserStoryDto {
  numericId: number;
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
  private userStoryService = inject(UserStoryService);
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private cdr = inject(ChangeDetectorRef);

  activeSection: 'services' | 'calendar' = 'services';
  serviceViewMode: 'list' | 'detail' = 'list';
  activeTab: 'dashboard' | 'projects' | 'userStories' | 'teamMembers' | 'calendar' = 'dashboard';

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
  newService: CreateServiceDto = { name: '' };

  currentDateLabel = '';
  userName = '';
  userRole = '';
  notificationCount = 0;

  currentMonth = new Date();
  readonly calendarWeekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  calendarDays: Array<{ day: number; isToday: boolean; inCurrentMonth: boolean; hasProject: boolean }> = [];

  serviceUserStories: ServiceUserStoryRow[] = [];
  userStoryStatuses = [
    { value: UserStoryStatus.TODO, label: 'To Do' },
    { value: UserStoryStatus.IN_PROGRESS, label: 'In Progress' },
    { value: UserStoryStatus.REVIEW, label: 'Review' },
    { value: UserStoryStatus.TESTING, label: 'Testing' },
    { value: UserStoryStatus.DONE, label: 'Done' }
  ];
  selectedUserStoryStatuses: Record<number, UserStoryStatus> = {};

  showUserStoryModal = false;
  userStorySubmitting = false;
  availableSprints: Sprint[] = [];
  userStoryPriorities = [1, 2, 3, 4, 5];
  userStoryForm = {
    title: '',
    description: '',
    acceptanceCriteria: '',
    sprintId: null as number | null,
    storyPoints: 1,
    priority: 3
  };

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

  get calendarTitle(): string {
    return this.currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  get selectedService(): Service | null {
    if (!this.selectedServiceId) return null;
    return this.services.find((service) => service.id === this.selectedServiceId) ?? null;
  }

  get filteredServices(): Service[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.services.filter((service) => {
      const matchesTerm = !term || service.name.toLowerCase().includes(term);
      const matchesStatus = this.statusFilter === 'all' || this.getServiceStatus(service) === 'Actif';
      return matchesTerm && matchesStatus;
    });
  }

  get selectedServiceTeams(): TeamEntity[] {
    if (!this.selectedServiceId) return [];
    return this.serviceTeams.filter((team) => this.getTeamServiceId(team) === this.selectedServiceId);
  }

  get selectedServiceProjects(): ProjectEntity[] {
    if (!this.selectedServiceId) return [];
    return this.allProjects.filter((project) => this.getProjectServiceId(project) === this.selectedServiceId);
  }

  get teamRows(): TeamMemberRow[] {
    if (!this.selectedService || this.selectedServiceMembers.length === 0) return [];

    return this.selectedServiceMembers.map((member) => {
      const memberUser = member.user;
      const isManager = this.selectedService?.responsibleId === member.userId;
      const firstName = memberUser?.firstName ?? 'Member';
      const lastName = memberUser?.lastName ?? String(member.userId ?? '');
      const fullName = `${firstName} ${lastName}`.trim();

      return {
        fullName,
        email: memberUser?.email ?? '—',
        roleLabel: this.getRoleLabel(member.role, isManager),
        roleClass: this.getRoleClass(member.role, isManager),
        activeTasks: 0,
        completedTasks: 0,
        avatar: this.getInitials(fullName),
        subtitle: isManager ? 'Chef de service' : undefined,
      };
    });
  }

  get membersCount(): number {
    return this.selectedServiceMemberIds.size;
  }

  get teamsCount(): number {
    return this.selectedServiceTeams.length;
  }

  get projectsCount(): number {
    return this.selectedServiceProjects.length;
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
    return this.serviceUserStories.length;
  }

  get sprintTotal(): number {
    return this.availableSprints.length;
  }

  get activeSprintCount(): number {
    return this.availableSprints.filter((sprint) => Number((sprint as any).sprintState) === 2).length;
  }

  get completedSprintCount(): number {
    return this.availableSprints.filter((sprint) => {
      const state = Number((sprint as any).sprintState);
      return state === 3 || state === 4;
    }).length;
  }

  get completedUserStoriesCount(): number {
    return this.serviceUserStories.filter((story) => story.status === UserStoryStatus.DONE).length;
  }

  get inProgressUserStoriesCount(): number {
    return this.serviceUserStories.filter((story) => story.status === UserStoryStatus.IN_PROGRESS).length;
  }

  get todoTasksCount(): number {
    return 0;
  }

  loadServices(): void {
    this.loading = true;
    this.error = '';

    this.serviceApi.getServices()
      .pipe(
        timeout(10000),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (data) => {
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
    this.loadProjects();
  }

  backToServiceList(): void {
    this.serviceViewMode = 'list';
    this.selectedServiceId = null;
    this.selectedServiceMemberIds = new Set<number>();
    this.selectedServiceMembers = [];
    this.serviceUserStories = [];
  }

  openServicesList(): void {
    this.backToServiceList();
  }

  setTab(tab: 'dashboard' | 'projects' | 'userStories' | 'teamMembers' | 'calendar'): void {
    this.activeTab = tab;
    if (tab === 'userStories') {
      this.loadServiceUserStories();
    }
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
      queryParams: { serviceId: this.selectedServiceId ?? undefined }
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

  openProjectManager(projectId?: number): void {
    if (!projectId) return;
    this.router.navigate(['/ProjectManage'], {
      queryParams: {
        projectId,
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
          this.availableSprints = sprints ?? [];
          if (this.availableSprints.length === 0) {
            this.error = 'Aucun sprint trouvé. Créez un sprint pour gérer les user stories.';
            this.router.navigate(['/SprintManage', firstProjectId], {
              queryParams: { source: 'service-manager' }
            });
            return;
          }

          this.userStoryForm = {
            title: '',
            description: '',
            acceptanceCriteria: '',
            sprintId: this.availableSprints[0].id,
            storyPoints: 1,
            priority: 3
          };
          this.showUserStoryModal = true;
        },
        error: () => {
          this.error = 'Impossible de charger les sprints du projet.';
        }
      });
  }

  closeUserStoryModal(): void {
    this.showUserStoryModal = false;
  }

  submitCreateUserStory(): void {
    if (!this.selectedServiceProjects[0]?.id || !this.userStoryForm.sprintId || !this.userStoryForm.title.trim()) {
      this.error = 'Veuillez remplir les champs obligatoires de la user story.';
      return;
    }

    this.userStorySubmitting = true;
    this.error = '';

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    const request: CreateUserStoryRequest = {
      name: this.userStoryForm.title,
      title: this.userStoryForm.title,
      description: this.userStoryForm.description || this.userStoryForm.title,
      acceptanceCriteria: this.userStoryForm.acceptanceCriteria,
      storyPoints: Number(this.userStoryForm.storyPoints),
      priority: Number(this.userStoryForm.priority),
      status: UserStoryStatus.TODO,
      startDate,
      endDate,
      estimatedDuration: 1,
      userStoryState: 1,
      projectId: this.selectedServiceProjects[0].id!,
      sprintId: Number(this.userStoryForm.sprintId),
    };

    this.userStoryService.create(request)
      .pipe(finalize(() => (this.userStorySubmitting = false)))
      .subscribe({
        next: () => {
          this.showUserStoryModal = false;
          this.loadServiceUserStories();
        },
        error: () => {
          this.error = 'Impossible de créer la user story.';
        }
      });
  }

  logout(): void {
    this.tokenService.clear();
    this.router.navigate(['/login']);
  }

  prevMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
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
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getServiceProjectsCount(service: Service): number {
    return this.allProjects.filter((project) => this.getProjectServiceId(project) === service.id).length;
  }

  getMembersCountForService(service: Service): number {
    if (!service?.id) return 0;
    if (this.selectedServiceId === service.id && this.selectedServiceMemberIds.size > 0) {
      return this.selectedServiceMemberIds.size;
    }

    const teamIds = this.serviceTeams
      .filter((team) => this.getTeamServiceId(team) === service.id)
      .map((team) => team.id);

    if (teamIds.length === 0) return 0;
    return this.selectedServiceMembers.filter((member) => teamIds.includes(member.teamId)).length;
  }

  getResponsibleLabel(service: Service): string {
    if (!service?.responsibleId) return 'Non assigné';
    const manager = this.selectedServiceMembers.find((member) => member.userId === service.responsibleId)?.user;
    if (manager) return `${manager.firstName} ${manager.lastName}`.trim();
    return `User #${service.responsibleId}`;
  }

  getProjectStatusLabel(project: ProjectEntity): string {
    const state = Number(project.projectState);
    if (state === ProjectState.done || state === ProjectState.validated) return 'Terminé';
    if (state === ProjectState.inProgress) return 'Actif';
    if (state === ProjectState.todo) return 'Planifié';
    return 'En attente';
  }

  getProjectStatusClass(project: ProjectEntity): string {
    const state = Number(project.projectState);
    if (state === ProjectState.done || state === ProjectState.validated) return 'done';
    if (state === ProjectState.inProgress) return 'active';
    if (state === ProjectState.todo) return 'todo';
    return 'pending';
  }

  getProjectProgress(project: ProjectEntity): number {
    const state = Number(project.projectState);
    if (state === ProjectState.done || state === ProjectState.validated) return 100;
    if (state === ProjectState.inProgress) return 65;
    if (state === ProjectState.todo) return 30;
    return 10;
  }

  getUserStoryStatusLabel(status: UserStoryStatus): string {
    return this.userStoryStatuses.find((item) => item.value === status)?.label ?? 'Unknown';
  }

  getUserStoryStatusClass(status: UserStoryStatus): string {
    if (status === UserStoryStatus.DONE) return 'done';
    if (status === UserStoryStatus.IN_PROGRESS) return 'active';
    if (status === UserStoryStatus.REVIEW || status === UserStoryStatus.TESTING) return 'review';
    return 'todo';
  }

  getSelectedUserStoryStatus(story: ServiceUserStoryRow): UserStoryStatus {
    return this.selectedUserStoryStatuses[story.numericId] ?? story.status;
  }

  setSelectedUserStoryStatus(storyId: string, status: UserStoryStatus): void {
    const numericId = Number(storyId);
    if (!Number.isFinite(numericId) || numericId <= 0) return;
    this.selectedUserStoryStatuses[numericId] = status;
  }

  saveUserStoryStatus(story: ServiceUserStoryRow): void {
    const newStatus = this.getSelectedUserStoryStatus(story);
    if (newStatus === story.status) return;

    this.userStoryService.updateStatus(story.numericId, newStatus).subscribe({
      next: () => {
        this.loadServiceUserStories();
      },
      error: () => {
        this.error = 'Impossible de mettre à jour le statut de la user story.';
      }
    });
  }

  private getRoleLabel(role: unknown, isManager: boolean): string {
    if (typeof role === 'number') {
      if (role === 0) return 'Administrateur';
      if (role === 1) return 'Service Manager';
      if (role === 2) return 'Chef de projet';
      if (role === 3) return 'Employé';
    }
    if (typeof role === 'string' && role.trim().length > 0) return role;
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
    this.userName = userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}` : '—';
    this.userRole = userData?.role ?? '—';
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
      const isToday = inCurrentMonth
        && dayNumber === today.getDate()
        && month === today.getMonth()
        && year === today.getFullYear();

      this.calendarDays.push({
        day: inCurrentMonth ? dayNumber : 0,
        isToday,
        inCurrentMonth,
        hasProject: false,
      });
    }

    const projectDates = this.selectedServiceProjects
      .map((project) => new Date(project.endDate as unknown as string))
      .filter((date) => !Number.isNaN(date.getTime()));

    this.calendarDays = this.calendarDays.map((cell) => {
      if (!cell.inCurrentMonth || cell.day <= 0) return cell;
      const cellDate = new Date(year, month, cell.day);
      const hasProject = projectDates.some((date) =>
        date.getFullYear() === cellDate.getFullYear()
        && date.getMonth() === cellDate.getMonth()
        && date.getDate() === cellDate.getDate()
      );
      return { ...cell, hasProject };
    });
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
      this.selectedServiceMembers = [];
      return;
    }

    const membersRequests = teams.map((team) =>
      this.teamService.getMembersByTeamId(team.id).pipe(catchError(() => of([] as TeamUser[])))
    );

    forkJoin(membersRequests).subscribe({
      next: (membersByTeam) => {
        const ids = new Set<number>();
        const members: TeamUser[] = [];

        membersByTeam.forEach((membersList) => {
          membersList.forEach((member) => {
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
        const firstProjectId = this.selectedServiceProjects[0]?.id;
        if (!firstProjectId) {
          this.availableSprints = [];
          this.generateCalendar();
          this.loadServiceUserStories();
          return;
        }

        this.sprintService.getSprintsByProjectId(firstProjectId).pipe(catchError(() => of([] as Sprint[]))).subscribe({
          next: (sprints) => {
            this.availableSprints = sprints ?? [];
            this.generateCalendar();
            this.loadServiceUserStories();
          },
          error: () => {
            this.availableSprints = [];
            this.generateCalendar();
            this.loadServiceUserStories();
          }
        });
      },
      error: () => {
        this.allProjects = [];
        this.availableSprints = [];
        this.serviceUserStories = [];
      }
    });
  }

  private loadServiceUserStories(): void {
    const projectIds = this.selectedServiceProjects
      .map((project) => project.id)
      .filter((id): id is number => typeof id === 'number' && id > 0);

    if (projectIds.length === 0) {
      this.serviceUserStories = [];
      this.selectedUserStoryStatuses = {};
      return;
    }

    const requests = projectIds.map((projectId) =>
      this.userStoryService.getByProjectId(projectId).pipe(catchError(() => of([] as UserStoryDto[])))
    );

    forkJoin(requests).subscribe({
      next: (storiesByProject) => {
        const flattened = storiesByProject.flat();
        this.serviceUserStories = flattened
          .map((story) => ({ ...story, numericId: Number(story.id) }))
          .filter((story) => Number.isFinite(story.numericId) && story.numericId > 0);

        this.selectedUserStoryStatuses = {};
        this.serviceUserStories.forEach((story) => {
          this.selectedUserStoryStatuses[story.numericId] = story.status;
        });
      },
      error: () => {
        this.serviceUserStories = [];
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
