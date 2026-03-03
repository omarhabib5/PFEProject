import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { CreateServiceDto, Service, ServicePage } from '../../Page/service-page/Service/ServicePage';
import { TokenService } from '../../Auth/Service/token.service';
import { Team as TeamEntity, TeamService, TeamUser } from '../../Page/Team/Service/TeamService';
import { ProjectService, State as ProjectState, project as ProjectEntity } from '../../Page/Projet/Service/ProjectService';
import { Sprint as SprintEntity, SprintService } from '../../Page/Sprint/Service/SprintService';
import { UserStoryService } from '../../Page/UserStory/Service/UserStoryService';
import { CreateUserStoryRequest, UserStoryDto, UserStoryStatus } from '../../Page/UserStory/Models/userstory.model';

type ServiceDashboardTab = 'dashboard' | 'projects' | 'userStories' | 'teamMembers' | 'calendar';

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

interface CalendarDayCell {
  date: Date;
  day: number;
  isToday: boolean;
  inCurrentMonth: boolean;
  hasProject: boolean;
}

@Component({
  selector: 'app-responsable-service-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './responsable-service-dashboard.html',
  styleUrl: './responsable-service-dashboard.css',
})
export class ResponsableServiceDashboard implements OnInit {
  private serviceApi = inject(ServicePage);
  private teamService = inject(TeamService);
  private projectService = inject(ProjectService);
  private sprintService = inject(SprintService);
  private userStoryService = inject(UserStoryService);
  private router = inject(Router);
  private tokenService = inject(TokenService);

  serviceViewMode: 'list' | 'detail' = 'list';
  activeTab: ServiceDashboardTab = 'dashboard';

  loading = false;
  error = '';
  searchTerm = '';
  statusFilter: 'all' | 'active' = 'all';

  services: Service[] = [];
  serviceTeams: TeamEntity[] = [];
  allProjects: ProjectEntity[] = [];
  serviceSprints: SprintEntity[] = [];
  serviceUserStories: UserStoryDto[] = [];
  selectedServiceMemberIds = new Set<number>();
  selectedServiceId: number | null = null;

  showCreateModal = false;
  showUserStoryModal = false;
  userStorySubmitting = false;

  userStoryForm: CreateUserStoryRequest = {
    title: '',
    description: '',
    acceptanceCriteria: '',
    storyPoints: 1,
    priority: 3,
    sprintId: 0,
    assignedToId: undefined
  };

  readonly userStoryStatuses = [
    { value: UserStoryStatus.PENDING, label: 'En attente' },
    { value: UserStoryStatus.TODO, label: 'À faire' },
    { value: UserStoryStatus.IN_PROGRESS, label: 'En cours' },
    { value: UserStoryStatus.DONE, label: 'Terminé' },
    { value: UserStoryStatus.VALIDATED, label: 'Validé' }
  ];

  readonly userStoryPriorities = [1, 2, 3, 4, 5];

  selectedUserStoryStatus: Record<number, UserStoryStatus> = {};

  newService: CreateServiceDto = {
    name: ''
  };

  currentDateLabel = '';
  userName = '';
  userRole = '';
  notificationCount = 0;
  currentMonth = new Date();
  calendarDays: CalendarDayCell[] = [];
  calendarWeekdays = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

  get teamRows(): TeamMemberRow[] {
    const service = this.selectedService;
    if (!service) {
      return [];
    }

    return (service.members ?? []).map((member) => {
      const isManager = service.responsibleId === member.id;
      const memberData = member as unknown as Record<string, unknown>;
      const roleValue = memberData['role'];

      return {
        fullName: `${member.firstName} ${member.lastName}`,
        email: member.email,
        roleLabel: this.getRoleLabel(roleValue, isManager),
        roleClass: this.getRoleClass(roleValue, isManager),
        activeTasks: this.toNumber(memberData['activeTasks']),
        completedTasks: this.toNumber(memberData['completedTasks']),
        avatar: this.getInitials(`${member.firstName} ${member.lastName}`),
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
    return this.serviceUserStories.length;
  }

  get sprintTotal(): number {
    return this.serviceSprints.length;
  }

  get activeSprintCount(): number {
    return this.serviceSprints.filter((sprint) => !this.isDoneState((sprint as unknown as Record<string, unknown>)['sprintState'])).length;
  }

  get completedSprintCount(): number {
    return this.serviceSprints.filter((sprint) => this.isDoneState((sprint as unknown as Record<string, unknown>)['sprintState'])).length;
  }

  get completedUserStoriesCount(): number {
    return this.serviceUserStories.filter((story) => this.isDoneState(story.status)).length;
  }

  get inProgressUserStoriesCount(): number {
    return this.serviceUserStories.filter((story) => !this.isDoneState(story.status)).length;
  }

  get todoTasksCount(): number {
    return this.serviceUserStories.reduce((sum, story) => sum + Math.max((story.taskCount ?? 0) - (story.completedTaskCount ?? 0), 0), 0);
  }

  ngOnInit(): void {
    if (!this.tokenService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.setUserProfile();
    this.setCurrentDate();
    this.loadServices();
  }

  get pageTitle(): string {
    if (this.serviceViewMode === 'list') return 'Gestion des Services';
    if (this.activeTab === 'dashboard') return 'Tableau de bord du service';
    if (this.activeTab === 'projects') return 'Projets du service';
    if (this.activeTab === 'userStories') return 'User Stories';
    if (this.activeTab === 'teamMembers') return 'Équipes et membres';
    if (this.activeTab === 'calendar') return 'Calendrier';
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
    return this.selectedService?.members?.length ?? 0;
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
    return this.selectedService?.teams?.length ?? 0;
  }

  get projectsCount(): number {
    if (this.selectedServiceProjects.length > 0) {
      return this.selectedServiceProjects.length;
    }
    return this.selectedService?.projects?.length ?? 0;
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
        next: (data) => {
          this.services = data ?? [];
          if (this.services.length > 0 && !this.selectedServiceId) {
            this.selectedServiceId = this.services[0].id;
          }
          this.loadTeams();
          this.loadProjects();
          this.generateCalendar();
        },
        error: () => {
          this.error = 'Impossible de charger les services. Vérifiez que le backend est démarré.';
          this.services = [];
        }
      });
  }

  openServicesList(): void {
    this.backToServiceList();
  }

  openServiceDetails(service: Service): void {
    this.selectedServiceId = service.id;
    this.serviceViewMode = 'detail';
    this.activeTab = 'dashboard';
    this.loadMembersForSelectedService();
    this.loadTeams();
    this.loadServiceInsights();
    this.generateCalendar();
  }

  backToServiceList(): void {
    this.serviceViewMode = 'list';
    this.activeTab = 'dashboard';
    this.selectedServiceMemberIds = new Set<number>();
    this.serviceSprints = [];
    this.serviceUserStories = [];
  }

  setTab(tab: ServiceDashboardTab): void {
    this.activeTab = tab;
    if (tab === 'calendar') {
      this.generateCalendar();
    }
  }

  prevMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.generateCalendar();
  }

  get calendarTitle(): string {
    return this.currentMonth.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  }

  openProjectManager(projectId?: number): void {
    this.router.navigate(['/ProjectManage'], {
      queryParams: {
        serviceId: this.selectedServiceId ?? undefined,
        id: projectId ?? undefined,
        source: 'service-manager'
      }
    });
  }

  get availableSprints(): SprintEntity[] {
    return this.serviceSprints.filter((sprint) => typeof sprint.id === 'number' && sprint.id > 0);
  }

  openUserStories(): void {
    this.error = '';
    this.activeTab = 'userStories';

    if (this.availableSprints.length === 0) {
      this.error = 'Aucun sprint trouvé. Créez un sprint pour pouvoir ajouter des user stories.';
      return;
    }

    this.userStoryForm = {
      title: '',
      description: '',
      acceptanceCriteria: '',
      storyPoints: 1,
      priority: 3,
      sprintId: this.availableSprints[0].id,
      assignedToId: undefined
    };
    this.showUserStoryModal = true;
  }

  closeUserStoryModal(): void {
    this.showUserStoryModal = false;
  }

  submitCreateUserStory(): void {
    if (this.userStorySubmitting) {
      return;
    }

    const title = this.userStoryForm.title?.trim();
    if (!title) {
      this.error = 'Le titre de la user story est obligatoire.';
      return;
    }

    if (!this.userStoryForm.sprintId || this.userStoryForm.sprintId <= 0) {
      this.error = 'Veuillez sélectionner un sprint valide.';
      return;
    }

    this.error = '';
    this.userStorySubmitting = true;

    const payload: CreateUserStoryRequest = {
      ...this.userStoryForm,
      title,
      description: this.userStoryForm.description?.trim() ?? '',
      acceptanceCriteria: this.userStoryForm.acceptanceCriteria?.trim() ?? '',
      storyPoints: Number(this.userStoryForm.storyPoints) || 1,
      priority: Number(this.userStoryForm.priority) || 3,
      assignedToId: this.userStoryForm.assignedToId || undefined
    };

    this.userStoryService.create(payload)
      .pipe(
        timeout(10000),
        finalize(() => {
          this.userStorySubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.showUserStoryModal = false;
          this.loadServiceInsights();
        },
        error: () => {
          this.error = 'Impossible de créer la user story.';
        }
      });
  }

  getSelectedUserStoryStatus(story: UserStoryDto): UserStoryStatus {
    return this.selectedUserStoryStatus[story.id] ?? (story.status as UserStoryStatus);
  }

  setSelectedUserStoryStatus(storyId: number, status: UserStoryStatus): void {
    this.selectedUserStoryStatus[storyId] = status;
  }

  saveUserStoryStatus(story: UserStoryDto): void {
    const nextStatus = this.getSelectedUserStoryStatus(story);
    if (nextStatus === story.status) {
      return;
    }

    this.userStoryService.updateStatus(story.id, nextStatus)
      .pipe(timeout(10000))
      .subscribe({
        next: () => {
          this.serviceUserStories = this.serviceUserStories.map((item) =>
            item.id === story.id ? { ...item, status: nextStatus } : item
          );
        },
        error: () => {
          this.error = 'Impossible de mettre à jour le statut de la user story.';
          this.selectedUserStoryStatus[story.id] = story.status as UserStoryStatus;
        }
      });
  }

  getProjectStatusLabel(project: ProjectEntity): string {
    const value = Number((project as ProjectEntity).projectState);
    const map: Record<number, string> = {
      [ProjectState.pending]: 'En attente',
      [ProjectState.todo]: 'À faire',
      [ProjectState.inProgress]: 'Actif',
      [ProjectState.done]: 'Terminé',
      [ProjectState.validated]: 'Validé'
    };
    return map[value] ?? 'Inconnu';
  }

  getProjectStatusClass(project: ProjectEntity): string {
    const value = Number((project as ProjectEntity).projectState);
    const map: Record<number, string> = {
      [ProjectState.pending]: 'pending',
      [ProjectState.todo]: 'todo',
      [ProjectState.inProgress]: 'active',
      [ProjectState.done]: 'done',
      [ProjectState.validated]: 'done'
    };
    return map[value] ?? 'pending';
  }

  getProjectProgress(project: ProjectEntity): number {
    const value = Number((project as ProjectEntity).projectState);
    const map: Record<number, number> = {
      [ProjectState.pending]: 10,
      [ProjectState.todo]: 30,
      [ProjectState.inProgress]: 60,
      [ProjectState.done]: 100,
      [ProjectState.validated]: 100
    };
    return map[value] ?? 0;
  }

  getUserStoryStatusLabel(status: unknown): string {
    if (typeof status === 'number') {
      if (status === 0) return 'En attente';
      if (status === 1) return 'À faire';
      if (status === 2) return 'En cours';
      if (status === 3) return 'Terminé';
      if (status === 4) return 'Validé';
    }
    if (typeof status === 'string') {
      const normalized = status.trim().toLowerCase();
      if (normalized === 'pending') return 'En attente';
      if (normalized === 'todo') return 'À faire';
      if (normalized === 'inprogress') return 'En cours';
      if (normalized === 'done') return 'Terminé';
      if (normalized === 'validated') return 'Validé';
    }
    return 'Inconnu';
  }

  getUserStoryStatusClass(status: unknown): string {
    if (typeof status === 'number') {
      if (status === 2) return 'in-progress';
      if (status === 3 || status === 4) return 'done';
      return 'todo';
    }
    if (typeof status === 'string') {
      const normalized = status.trim().toLowerCase();
      if (normalized === 'inprogress') return 'in-progress';
      if (normalized === 'done' || normalized === 'validated') return 'done';
      return 'todo';
    }
    return 'todo';
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

  logout(): void {
    this.tokenService.clear();
    this.router.navigate(['/login']);
  }

  getServiceStatus(_service: Service): 'Actif' { 
    return 'Actif';
  }

  getServiceAvatars(service: Service): string[] {
    const members = service.members ?? [];
    return members.slice(0, 3).map(member => this.getInitials(`${member.firstName} ${member.lastName}`));
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
      return service.projects?.length ?? 0;
    }

    const filteredCount = this.allProjects.filter((project) => this.getProjectServiceId(project) === serviceId).length;
    if (filteredCount > 0) {
      return filteredCount;
    }

    return service.projects?.length ?? 0;
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
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startOffset);
    const totalCells = 42;

    const today = new Date();
    this.calendarDays = [];

    for (let index = 0; index < totalCells; index++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const inCurrentMonth = date.getMonth() === month;
      const isToday = date.getDate() === today.getDate()
        && date.getMonth() === today.getMonth()
        && date.getFullYear() === today.getFullYear();

      this.calendarDays.push({
        date,
        day: date.getDate(),
        isToday,
        inCurrentMonth,
        hasProject: this.hasProjectOnDate(date)
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
        membersByTeam.forEach((members) => {
          members.forEach((member) => {
            if (typeof member.userId === 'number') {
              ids.add(member.userId);
            }
          });
        });
        this.selectedServiceMemberIds = ids;
      },
      error: () => {
        this.selectedServiceMemberIds = new Set<number>();
      }
    });
  }

  private loadProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.allProjects = projects ?? [];
        this.loadServiceInsights();
        this.generateCalendar();
      },
      error: () => {
        this.allProjects = [];
        this.serviceSprints = [];
        this.serviceUserStories = [];
        this.generateCalendar();
      }
    });
  }

  private loadServiceInsights(): void {
    const projectIds = this.getSelectedServiceProjectIds();
    if (projectIds.length === 0) {
      this.serviceSprints = [];
      this.serviceUserStories = [];
      return;
    }

    const sprintRequests = projectIds.map((projectId) =>
      this.sprintService
        .getSprintsByProjectId(projectId)
        .pipe(
          timeout(10000),
          catchError(() => of([] as SprintEntity[]))
        )
    );

    forkJoin(sprintRequests).subscribe({
      next: (sprintsByProject) => {
        const sprints = sprintsByProject.flat();
        this.serviceSprints = this.uniqueById(sprints);

        const sprintIds = this.serviceSprints.map((sprint) => sprint.id).filter((id) => typeof id === 'number' && id > 0);
        if (sprintIds.length === 0) {
          this.serviceUserStories = [];
          return;
        }

        const userStoryRequests = sprintIds.map((sprintId) =>
          this.userStoryService
            .getBySprintId(sprintId)
            .pipe(
              timeout(10000),
              catchError(() => of([] as UserStoryDto[]))
            )
        );

        forkJoin(userStoryRequests).subscribe({
          next: (storiesBySprint) => {
            this.serviceUserStories = this.uniqueById(storiesBySprint.flat());
          },
          error: () => {
            this.serviceUserStories = [];
          }
        });
      },
      error: () => {
        this.serviceSprints = [];
        this.serviceUserStories = [];
      }
    });
  }

  private getSelectedServiceProjectIds(): number[] {
    const ids = new Set<number>();

    this.selectedServiceProjects.forEach((project) => {
      if (typeof project.id === 'number' && project.id > 0) {
        ids.add(project.id);
      }
    });

    const selectedServiceProjects = this.selectedService?.projects as Array<{ id?: unknown }> | undefined;
    selectedServiceProjects?.forEach((project) => {
      if (typeof project?.id === 'number' && project.id > 0) {
        ids.add(project.id);
      }
    });

    return Array.from(ids);
  }

  private hasProjectOnDate(date: Date): boolean {
    const key = this.toDateKey(date);
    return this.selectedServiceProjects.some((project) => {
      const typedProject = project as ProjectEntity & { startDate?: string | Date; endDate?: string | Date };
      const startDate = typedProject.startDate;
      const endDate = typedProject.endDate;

      if (!startDate || !endDate) {
        return false;
      }

      const start = this.toDateKey(new Date(startDate));
      const end = this.toDateKey(new Date(endDate));
      return key >= start && key <= end;
    });
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private uniqueById<T extends { id?: number }>(items: T[]): T[] {
    const map = new Map<number, T>();
    items.forEach((item) => {
      if (typeof item.id === 'number' && item.id > 0) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }

  private isDoneState(value: unknown): boolean {
    if (typeof value === 'number') {
      return value === 3 || value === 4;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'done' || normalized === 'validated' || normalized === 'completed';
    }

    return false;
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
