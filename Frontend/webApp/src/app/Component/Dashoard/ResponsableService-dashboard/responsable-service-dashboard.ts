import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { AuthService } from '../../Auth/Service/auth.service';
import { TokenService } from '../../Auth/Service/token.service';
import { CreateProjectDto, ProjectService, State as ProjectState, UpdateProjectDto, project as ProjectEntity } from '../../Page/Projet/Service/ProjectService';
import { Sprint, SprintService, State as SprintState } from '../../Page/Sprint/Service/SprintService';
import { TaskDto, TaskService, TaskState } from '../../Page/Task/Service/TaskService';
import { Team as TeamEntity, TeamService, TeamUser } from '../../Page/Team/Service/TeamService';
import { CreateServiceDto, Service, ServiceService } from '../../Page/Team/Service/ServiceService';
import { UserApiService } from '../../Page/Team/Service/UserApiService';
import { CreateUserStoryRequest, UserStoryDto, UserStoryStatus, UserStoryStateValue } from '../../Page/UserStory/Models/userstory.model';
import { UserStoryService } from '../../Page/UserStory/Service/UserStoryService';
import { NotificationService } from '../../Page/Notifiation/Service/NotifcationService';
import { Notification as AppNotification } from '../../Page/Notifiation/Models/Notification.Model';
import { NotificationType } from '../../Page/Notifiation/Models/Notification.Model';

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
export class ResponsableServiceDashboard implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private serviceApi = inject(ServiceService);
  private teamService = inject(TeamService);
  private projectService = inject(ProjectService);
  private sprintService = inject(SprintService);
  private taskService = inject(TaskService);
  private userStoryService = inject(UserStoryService);
  private userApiService = inject(UserApiService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private cdr = inject(ChangeDetectorRef);

  private currentResponsibleId: number | null = null;
  private notificationCountSubscription: Subscription | null = null;
  private notificationsSubscription: Subscription | null = null;

  activeSection: 'services' | 'calendar' = 'services';
  serviceViewMode: 'list' | 'detail' = 'list';
  activeTab: 'dashboard' | 'projects' | 'sprints' | 'userStories' | 'teamMembers' | 'calendar' | 'notifications' | 'settings' = 'dashboard';

  loading = false;
  error = '';
  success = '';
  searchTerm = '';
  statusFilter: 'all' | 'active' = 'all';

  services: Service[] = [];
  serviceTeams: TeamEntity[] = [];
  allProjects: ProjectEntity[] = [];
  serviceTasks: TaskDto[] = [];
  serviceUsers: Array<{ id?: number | string; firstName?: string; lastName?: string; email?: string; serviceId?: number | string }> = [];
  selectedServiceMemberIds = new Set<number>();
  selectedServiceMembers: TeamUser[] = [];
  selectedServiceId: number | null = null;
  selectedProjectId: number | null = null;

  showProjectForm = false;
  projectSubmitting = false;
  projectFormMode: 'create' | 'edit' = 'create';
  editingProjectId: number | null = null;
  projectStateOptions = [
    { value: ProjectState.todo, label: 'Planned' },
    { value: ProjectState.inProgress, label: 'Active' },
    { value: ProjectState.done, label: 'Done' },
    { value: ProjectState.validated, label: 'Validated' },
  ];
  projectForm = {
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    estimatedDuration: 14,
    projectState: ProjectState.todo as ProjectState,
    teamId: null as number | null,
  };

  showCreateModal = false;
  serviceSubmitting = false;
  serviceModalMode: 'create' | 'edit' = 'create';
  newService: CreateServiceDto = { name: '', responsibleId: undefined };
  editingServiceId: number | null = null;

  currentDateLabel = '';
  userName = '';
  userRole = '';
  notificationCount = 0;
  apiNotifications: AppNotification[] = [];
  notifications: AppNotification[] = [];
  private acknowledgedOverdueNotificationKeys = new Set<string>();
  profileImageUrl = '';

  currentMonth = new Date();
  selectedCalendarDateIso = this.toIsoDateLocal(new Date());
  readonly calendarWeekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  calendarDays: Array<{
    day: number;
    iso: string;
    isToday: boolean;
    inCurrentMonth: boolean;
    hasProject: boolean;
    projectDeadlineCount: number;
    hasTask: boolean;
    taskCount: number;
  }> = [];

  serviceUserStories: ServiceUserStoryRow[] = [];
  userStoryStatuses = [
    { value: UserStoryStatus.TODO, label: 'To Do' },
    { value: UserStoryStatus.IN_PROGRESS, label: 'In Progress' },
    { value: UserStoryStatus.REVIEW, label: 'Review' },
    { value: UserStoryStatus.TESTING, label: 'Testing' },
    { value: UserStoryStatus.DONE, label: 'Done' }
  ];
  selectedUserStoryStatuses: Record<number, UserStoryStateValue | undefined> = {};

  showUserStoryModal = false;
  userStorySubmitting = false;
  availableSprints: Sprint[] = [];
  showSprintForm = false;
  sprintSubmitting = false;
  sprintFormMode: 'create' | 'edit' = 'create';
  editingSprintId: number | null = null;
  sprintStateOptions = [
    { value: SprintState.pending, label: 'Pending' },
    { value: SprintState.todo, label: 'To Do' },
    { value: SprintState.inProgress, label: 'In Progress' },
    { value: SprintState.done, label: 'Done' },
    { value: SprintState.validated, label: 'Validated' },
  ];
  sprintForm = {
    name: '',
    description: '',
    projectId: null as number | null,
    startDate: '',
    endDate: '',
    estimatedDuration: 14,
    sprintState: SprintState.todo as SprintState,
  };
  userStoryPriorities = [1, 2, 3, 4, 5];
  userStoryForm = {
    title: '',
    description: '',
    acceptanceCriteria: '',
    sprintId: null as number | null,
    storyPoints: 1,
    priority: 3
  };

  profileSaving = false;
  passwordSaving = false;
  profileAvatarFileName = '';
  profileAvatarPreviewUrl = '';
  profileForm = {
    firstName: '',
    lastName: '',
    email: '',
    avatarUrl: ''
  };
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };

  ngOnInit(): void {
    if (!this.tokenService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.setUserProfile();
    this.setCurrentDate();
    this.generateCalendar();
    this.loadUserSettings();
    this.loadServices();
    this.initializeNotifications();
  }

  ngOnDestroy(): void {
    this.notificationCountSubscription?.unsubscribe();
    this.notificationCountSubscription = null;
    this.notificationsSubscription?.unsubscribe();
    this.notificationsSubscription = null;
  }

  get pageTitle(): string {
    if (this.activeSection === 'calendar') return 'Calendar';
    if (this.serviceViewMode === 'detail') return 'My Service';
    return 'Service Management';
  }

  get calendarTitle(): string {
    return this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get selectedCalendarDateLabel(): string {
    const selectedDate = this.parseToLocalDate(this.selectedCalendarDateIso);
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  get selectedService(): Service | null {
    if (!this.selectedServiceId) return null;
    return this.services.find((service) => this.areSameIds(service.id, this.selectedServiceId)) ?? null;
  }

  get filteredServices(): Service[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.services.filter((service) => {
      const matchesTerm = !term || service.name.toLowerCase().includes(term);
      const matchesStatus = this.statusFilter === 'all' || this.getServiceStatus(service) === 'Active';
      return matchesTerm && matchesStatus;
    });
  }

  get selectedServiceTeams(): TeamEntity[] {
    if (!this.selectedServiceId) return [];
    return this.serviceTeams.filter((team) => this.areSameIds(this.getTeamServiceId(team), this.selectedServiceId));
  }

  get selectedServiceProjects(): ProjectEntity[] {
    if (!this.selectedServiceId) return [];
    return this.allProjects.filter((project) => this.belongsToSelectedService(project));
  }

  get selectedProject(): ProjectEntity | null {
    if (!this.selectedProjectId) return null;
    return this.selectedServiceProjects.find((project) => Number(project.id) === Number(this.selectedProjectId)) ?? null;
  }

  get selectedProjectTeam(): TeamEntity | null {
    const project = this.selectedProject;
    if (!project?.teamId) return null;
    return this.selectedServiceTeams.find((team) => Number(team.id) === Number(project.teamId)) ?? null;
  }

  get selectedProjectTeamMembers(): TeamUser[] {
    const team = this.selectedProjectTeam;
    if (!team) return [];
    return this.selectedServiceMembers.filter((member) => Number(member.teamId) === Number(team.id));
  }

  get selectedProjectSprints(): Sprint[] {
    const project = this.selectedProject;
    if (!project?.id) return [];
    return this.availableSprints.filter((sprint) => Number(sprint.projectId) === Number(project.id));
  }

  get selectedProjectProgressPercent(): number {
    const project = this.selectedProject;
    if (!project) return 0;
    return this.getProjectProgress(project);
  }

  get teamRows(): TeamMemberRow[] {
    if (!this.selectedService || this.selectedServiceMembers.length === 0) return [];

    return this.selectedServiceMembers.map((member) => {
      const memberUser = member.user;
      const isManager = this.selectedService?.responsibleId === member.userId;
      const firstName = memberUser?.firstName ?? 'Member';
      const lastName = memberUser?.lastName ?? String(member.userId ?? '');
      const fullName = `${firstName} ${lastName}`.trim();
      const assignedTasks = this.serviceTasks.filter((task) => Number(task.assignedToId ?? 0) === Number(member.userId));
      const completedTasks = assignedTasks.filter((task) => {
        const state = this.normalizeTaskState(task.status);
        return state === 'done' || state === 'validated';
      }).length;
      const activeTasks = assignedTasks.filter((task) => {
        const state = this.normalizeTaskState(task.status);
        return state === 'inProgress' || state === 'todo' || state === 'pending';
      }).length;

      return {
        fullName,
        email: memberUser?.email ?? '—',
        roleLabel: this.getRoleLabel(member.role, isManager),
        roleClass: this.getRoleClass(member.role, isManager),
        activeTasks,
        completedTasks,
        avatar: this.getInitials(fullName),
        subtitle: isManager ? 'Service Manager' : undefined,
      };
    });
  }

  get membersCount(): number {
    if (this.selectedServiceMemberIds.size > 0) {
      return this.selectedServiceMemberIds.size;
    }

    if (!this.selectedServiceId) {
      return 0;
    }

    const ids = new Set<number>();
    this.serviceUsers.forEach((user) => {
      if (!this.areSameIds(this.getUserServiceId(user), this.selectedServiceId)) return;
      const userId = this.normalizeId(user.id);
      if (userId !== null) ids.add(userId);
    });

    return ids.size;
  }

  get teamsCount(): number {
    return this.selectedServiceTeams.length;
  }

  get projectsCount(): number {
    return this.selectedServiceProjects.length;
  }

  get completedTasksCount(): number {
    return this.serviceTasks.filter((task) => {
      const state = this.normalizeTaskState(task.status);
      return state === 'done' || state === 'validated';
    }).length;
  }

  get activeTasksCount(): number {
    return this.serviceTasks.filter((task) => {
      const state = this.normalizeTaskState(task.status);
      return state === 'inProgress' || state === 'todo' || state === 'pending';
    }).length;
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
    return this.serviceUserStories.filter((story) => this.resolveStoryStatus(story) === UserStoryStatus.DONE).length;
  }

  get inProgressUserStoriesCount(): number {
    return this.serviceUserStories.filter((story) => this.resolveStoryStatus(story) === UserStoryStatus.IN_PROGRESS).length;
  }

  get todoTasksCount(): number {
    return this.serviceTasks.filter((task) => {
      const state = this.normalizeTaskState(task.status);
      return state === 'pending' || state === 'todo';
    }).length;
  }

  get selectedCalendarDayTasks(): TaskDto[] {
    const selectedIso = this.selectedCalendarDateIso;
    return this.serviceTasks.filter((task) => {
      const startIso = this.getSafeIsoDate(task.startDate);
      const endIso = this.getSafeIsoDate(task.endDate);
      if (!startIso || !endIso) {
        return false;
      }
      return selectedIso >= startIso && selectedIso <= endIso;
    });
  }

  get selectedCalendarDayProjectDeadlines(): ProjectEntity[] {
    const selectedIso = this.selectedCalendarDateIso;
    return this.selectedServiceProjects.filter((project) => {
      const deadlineIso = this.getSafeIsoDate(project.endDate as Date | string | null | undefined);
      return !!deadlineIso && deadlineIso === selectedIso;
    });
  }

  loadServices(silent = false): void {
    if (!silent) {
      this.loading = true;
      this.error = '';
      this.success = '';
    }
    this.currentResponsibleId = this.resolveCurrentResponsibleId();

    if (this.currentResponsibleId === null) {
      if (!silent) {
        this.loading = false;
        this.error = 'Service Manager user not identified.';
      }
      this.services = [];
      return;
    }

    this.serviceApi.getServices()
      .pipe(
        timeout(10000),
        finalize(() => {
          if (!silent) {
            this.loading = false;
          }
        })
      )
      .subscribe({
        next: (data) => {
          const previousSelectedServiceId = this.selectedServiceId;
          this.services = (data ?? []).filter((service) => Number(service.responsibleId ?? 0) === Number(this.currentResponsibleId));
          const selectedStillExists = this.services.some((service) => Number(service.id) === Number(previousSelectedServiceId));

          if (this.services.length > 0) {
            this.selectedServiceId = selectedStillExists
              ? previousSelectedServiceId
              : Number(this.services[0].id);
            this.serviceViewMode = this.selectedServiceId ? 'detail' : 'list';
            this.selectedProjectId = null;
          } else if (this.services.length === 0) {
            this.serviceViewMode = 'list';
            this.error = 'No service is assigned to you.';
            this.selectedServiceId = null;
            this.selectedProjectId = null;
          }
          this.loadTeams();
          this.loadProjects();
        },
        error: () => {
          if (!silent) {
            this.error = 'Unable to load services. Check that the backend is running.';
          }
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
    this.selectedProjectId = null;
    this.loadUsersForSelectedService();
    this.loadMembersForSelectedService();
    this.loadTeams();
    this.loadProjects();
  }

  backToServiceList(): void {
    this.serviceViewMode = 'list';
    this.selectedServiceId = null;
    this.selectedProjectId = null;
    this.selectedServiceMemberIds = new Set<number>();
    this.selectedServiceMembers = [];
    this.serviceUserStories = [];
    this.serviceTasks = [];
    this.recomputeNotificationsView();
  }

  openServicesList(): void {
    this.backToServiceList();
  }

  setTab(tab: 'dashboard' | 'projects' | 'sprints' | 'userStories' | 'teamMembers' | 'calendar' | 'notifications' | 'settings'): void {
    this.activeTab = tab;
    if (tab === 'dashboard') {
      this.loadUsersForSelectedService();
      this.loadTeams();
      this.loadProjects();
    }
    if (tab === 'projects') {
      this.loadProjects();
      if (!this.selectedProjectId && this.selectedServiceProjects.length > 0) {
        this.selectedProjectId = Number(this.selectedServiceProjects[0].id);
      }
    }
    if (tab === 'sprints') {
      this.loadProjects();
    }
    if (tab === 'userStories') {
      this.loadProjects();
    }
    if (tab === 'settings') {
      this.loadUserSettings();
    }
    if (tab === 'notifications') {
      this.refreshNotifications();
    }
  }

  openSettings(): void {
    if (this.serviceViewMode === 'list') {
      if (this.services.length > 0) {
        this.selectedServiceId = Number(this.services[0].id);
        this.serviceViewMode = 'detail';
      } else {
        this.error = 'No service available to open the dashboard.';
        return;
      }
    }

    this.activeTab = 'settings';
    this.loadUserSettings();
  }

  openNotifications(): void {
    if (this.serviceViewMode === 'list') {
      if (this.services.length > 0) {
        this.selectedServiceId = Number(this.services[0].id);
        this.serviceViewMode = 'detail';
        this.loadUsersForSelectedService();
        this.loadMembersForSelectedService();
        this.loadTeams();
        this.loadProjects();
      } else {
        this.error = 'No service available to open notifications.';
        return;
      }
    }

    this.activeTab = 'notifications';
    this.refreshNotifications();
  }

  markNotificationAsRead(notificationId: number): void {
    this.error = '';
    this.success = '';

    const localNotification = this.notifications.find((item) => item.id === notificationId && this.isLocalOverdueNotification(item));
    if (localNotification) {
      const key = this.extractOverdueNotificationKey(localNotification);
      if (key) {
        this.acknowledgedOverdueNotificationKeys.add(key);
      }
      this.recomputeNotificationsView();
      this.success = 'Notification marked as read.';
      return;
    }

    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        this.success = 'Notification marked as read.';
        this.refreshNotifications();
      },
      error: () => {
        this.error = 'Unable to mark notification as read.';
      }
    });
  }

  markAllNotificationsAsRead(): void {
    this.error = '';
    this.success = '';

    this.notifications
      .filter((item) => this.isLocalOverdueNotification(item) && !item.isRead)
      .forEach((item) => {
        const key = this.extractOverdueNotificationKey(item);
        if (key) {
          this.acknowledgedOverdueNotificationKeys.add(key);
        }
      });

    const userId = this.resolveCurrentResponsibleId();
    if (!userId) {
      this.recomputeNotificationsView();
      this.success = 'All notifications have been marked as read.';
      return;
    }

    this.notificationService.markAllAsRead(userId).subscribe({
      next: () => {
        this.success = 'All notifications have been marked as read.';
        this.refreshNotifications();
      },
      error: () => {
        this.error = 'Unable to mark all notifications as read.';
      }
    });
  }

  openCreateServiceModal(): void {
    this.serviceModalMode = 'create';
    this.editingServiceId = null;
    this.newService = { name: '', responsibleId: this.currentResponsibleId ?? undefined };
    this.showCreateModal = true;
    this.error = '';
  }



  closeServiceModal(): void {
    this.showCreateModal = false;
    this.serviceSubmitting = false;
    this.editingServiceId = null;
    this.newService = { name: '', responsibleId: this.currentResponsibleId ?? undefined };
  }

  saveService(): void {
    if (!this.newService.name.trim()) {
      this.error = 'Service name is required';
      return;
    }

    const payload: CreateServiceDto = {
      name: this.newService.name.trim(),
      responsibleId: this.currentResponsibleId ?? undefined
    };

    this.serviceSubmitting = true;
    this.error = '';
    this.success = '';

    if (this.serviceModalMode === 'edit' && this.editingServiceId) {
      this.serviceApi.updateService(this.editingServiceId, {
        id: this.editingServiceId,
        ...payload
      }).pipe(finalize(() => (this.serviceSubmitting = false))).subscribe({
        next: () => {
          this.success = 'Service updated successfully.';
          this.closeServiceModal();
          this.loadServices();
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Unable to update service';
        }
      });
      return;
    }

    this.serviceApi.createService(payload).pipe(finalize(() => (this.serviceSubmitting = false))).subscribe({
      next: (created) => {
        this.success = 'Service created successfully.';
        const createdId = Number((created as any)?.id ?? 0);
        this.closeServiceModal();
        this.loadServices();
        if (createdId > 0) {
          this.selectedServiceId = createdId;
          this.serviceViewMode = 'detail';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Unable to create service';
      }
    });
  }



  openProjects(): void {
    this.openCreateProjectForm();
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

  selectProject(project: ProjectEntity): void {
    const projectId = Number(project.id ?? 0);
    if (!projectId) return;
    this.selectedProjectId = projectId;
  }

  openCreateProjectForm(): void {
    if (!this.selectedServiceId) {
      this.error = 'Open a service before creating a project.';
      return;
    }

    this.error = '';
    this.success = '';
    this.projectFormMode = 'create';
    this.editingProjectId = null;
    this.showProjectForm = true;
    this.resetProjectForm();
    this.projectForm.teamId = this.selectedServiceTeams[0]?.id ?? null;
  }

  openEditProjectForm(project: ProjectEntity): void {
    this.error = '';
    this.success = '';
    this.projectFormMode = 'edit';
    this.editingProjectId = Number(project.id ?? 0);
    this.showProjectForm = true;

    const startDate = this.toDateInput(project.startDate);
    const endDate = this.toDateInput(project.endDate);
    this.projectForm = {
      name: String(project.name ?? '').trim(),
      description: String(project.description ?? ''),
      startDate,
      endDate,
      estimatedDuration: Number(project.estimatedDuration ?? this.calculateProjectDuration(startDate, endDate)),
      projectState: Number(project.projectState ?? ProjectState.todo) as ProjectState,
      teamId: this.normalizeId((project as any).teamId ?? (project as any).TeamId ?? project.teamId) ?? null,
    };
  }

  cancelProjectForm(): void {
    this.showProjectForm = false;
    this.projectSubmitting = false;
    this.editingProjectId = null;
    this.projectFormMode = 'create';
    this.resetProjectForm();
  }

  onProjectDatesChanged(): void {
    const start = this.projectForm.startDate;
    const end = this.projectForm.endDate;
    if (start && end && end < start) {
      this.projectForm.endDate = start;
    }
    this.projectForm.estimatedDuration = this.calculateProjectDuration(this.projectForm.startDate, this.projectForm.endDate);
  }

  submitProjectForm(): void {
    const name = this.projectForm.name.trim();
    const startDate = this.projectForm.startDate;
    const endDate = this.projectForm.endDate;
    const teamId = Number(this.projectForm.teamId ?? 0) || undefined;

    if (!name || !startDate || !endDate) {
      this.error = 'Project name, start date, and end date are required.';
      return;
    }

    if (endDate < startDate) {
      this.error = 'Project end date must be greater than or equal to the start date.';
      return;
    }

    if (teamId && !this.selectedServiceTeams.some((team) => Number(team.id) === teamId)) {
      this.error = 'Selected team does not belong to this service.';
      return;
    }

    const payload = {
      name,
      description: this.projectForm.description.trim(),
      startDate: this.parseToLocalDate(startDate),
      endDate: this.parseToLocalDate(endDate),
      estimatedDuration: this.calculateProjectDuration(startDate, endDate),
      projectState: Number(this.projectForm.projectState ?? ProjectState.todo) as ProjectState,
      serviceId: this.selectedServiceId ?? undefined,
      teamId,
      projectManagerId: this.currentResponsibleId ?? 0,
    };

    this.error = '';
    this.success = '';
    this.projectSubmitting = true;

    if (this.projectFormMode === 'edit' && this.editingProjectId) {
      const updatePayload: UpdateProjectDto = {
        name: payload.name,
        description: payload.description,
        startDate: payload.startDate,
        endDate: payload.endDate,
        estimatedDuration: payload.estimatedDuration,
        projectState: payload.projectState,
        serviceId: payload.serviceId,
        teamId: payload.teamId,
        projectManagerId: payload.projectManagerId,
      };

      this.projectService.updateProject(this.editingProjectId, updatePayload)
        .pipe(finalize(() => (this.projectSubmitting = false)))
        .subscribe({
          next: () => {
            this.success = 'Project updated successfully.';
            this.cancelProjectForm();
            this.loadProjects();
            this.cdr.detectChanges();
          },
          error: () => {
            this.error = 'Unable to update project.';
          }
        });
      return;
    }

    const createPayload: CreateProjectDto = {
      name: payload.name,
      description: payload.description,
      startDate: payload.startDate,
      endDate: payload.endDate,
      estimatedDuration: payload.estimatedDuration,
      projectState: payload.projectState,
      serviceId: payload.serviceId,
      teamId: payload.teamId,
      projectManagerId: payload.projectManagerId,
    };

    this.projectService.createProject(createPayload)
      .pipe(finalize(() => (this.projectSubmitting = false)))
      .subscribe({
        next: (result) => {
          this.success = 'Project created successfully.';
          this.cancelProjectForm();
          const createdId = Number((result as any)?.id ?? 0);
          this.loadProjects();
          if (createdId > 0) {
            this.selectedProjectId = createdId;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Unable to create project.';
        }
      });
  }

  deleteProject(project: ProjectEntity): void {
    const projectId = Number(project.id ?? 0);
    if (!projectId) return;

    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm(`Delete project "${project.name}"?`);
    if (!confirmed) {
      return;
    }

    this.error = '';
    this.success = '';
    this.projectSubmitting = true;

    this.projectService.deleteProject(projectId)
      .pipe(finalize(() => (this.projectSubmitting = false)))
      .subscribe({
        next: () => {
          if (this.editingProjectId === projectId) {
            this.cancelProjectForm();
          }
          if (this.selectedProjectId === projectId) {
            this.selectedProjectId = null;
          }
          this.success = 'Project deleted successfully.';
          this.loadProjects();
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Unable to delete project.';
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

  openSprints(): void {
    this.error = '';
    const firstProjectId = Number(this.selectedServiceProjects[0]?.id ?? 0);
    if (!firstProjectId) {
      this.error = 'Add a project to this service to manage sprints.';
      return;
    }

    this.router.navigate(['/SprintManage', firstProjectId], {
      queryParams: { source: 'service-manager' }
    });
  }

  openSprintManager(projectId?: number): void {
    const numericProjectId = Number(projectId ?? 0);
    if (!numericProjectId) {
      this.openSprints();
      return;
    }

    this.router.navigate(['/SprintManage', numericProjectId], {
      queryParams: {
        serviceId: this.selectedServiceId ?? undefined,
        source: 'service-manager'
      }
    });
  }

  openCreateSprintForm(projectId?: number): void {
    if (this.selectedServiceProjects.length === 0) {
      this.error = 'Add a project to this service before creating a sprint.';
      return;
    }

    this.error = '';
    this.success = '';
    this.sprintFormMode = 'create';
    this.editingSprintId = null;
    this.showSprintForm = true;
    this.resetSprintForm();
    const targetProjectId = Number(projectId ?? this.selectedProjectId ?? this.selectedServiceProjects[0]?.id ?? 0);
    this.sprintForm.projectId = targetProjectId > 0 ? targetProjectId : Number(this.selectedServiceProjects[0]?.id ?? 0) || null;
  }

  openEditSprintForm(sprint: Sprint): void {
    this.error = '';
    this.success = '';
    this.sprintFormMode = 'edit';
    this.editingSprintId = Number(sprint.id ?? 0);
    this.showSprintForm = true;
    const sprintProjectId = Number(sprint.projectId ?? 0);
    if (sprintProjectId > 0) {
      this.selectedProjectId = sprintProjectId;
    }

    const startDate = this.toDateInput(sprint.startDate);
    const endDate = this.toDateInput(sprint.endDate);

    this.sprintForm = {
      name: String(sprint.name ?? '').trim(),
      description: String(sprint.description ?? ''),
      projectId: Number(sprint.projectId ?? 0) || null,
      startDate,
      endDate,
      estimatedDuration: this.calculateSprintDuration(startDate, endDate),
      sprintState: Number(sprint.sprintState ?? SprintState.todo) as SprintState,
    };
  }

  cancelSprintForm(): void {
    this.showSprintForm = false;
    this.sprintSubmitting = false;
    this.editingSprintId = null;
    this.sprintFormMode = 'create';
    this.resetSprintForm();
  }

  onSprintDatesChanged(): void {
    const start = this.sprintForm.startDate;
    const end = this.sprintForm.endDate;

    if (start && end && end < start) {
      this.sprintForm.endDate = start;
    }

    this.sprintForm.estimatedDuration = this.calculateSprintDuration(
      this.sprintForm.startDate,
      this.sprintForm.endDate,
    );
  }

  submitSprintForm(): void {
    const projectId = Number(this.sprintForm.projectId ?? 0);
    const name = this.sprintForm.name.trim();
    const startDate = this.sprintForm.startDate;
    const endDate = this.sprintForm.endDate;

    if (!projectId || !name || !startDate || !endDate) {
      this.error = 'Name, project, start date, and end date are required.';
      return;
    }

    if (endDate < startDate) {
      this.error = 'End date must be greater than or equal to start date.';
      return;
    }

    const project = this.selectedServiceProjects.find((item) => Number(item.id) === projectId);
    if (!project) {
      this.error = 'Selected project does not belong to this service.';
      return;
    }

    const minProjectDate = this.toDateInput((project as any).startDate);
    const maxProjectDate = this.toDateInput((project as any).endDate);
    if (!this.isDateInRange(startDate, minProjectDate || undefined, maxProjectDate || undefined)
      || !this.isDateInRange(endDate, minProjectDate || undefined, maxProjectDate || undefined)) {
      this.error = 'Sprint dates must be within the selected project date range.';
      return;
    }

    const estimatedDuration = this.calculateSprintDuration(startDate, endDate);
    const payload = {
      name,
      description: this.sprintForm.description.trim(),
      estimatedDuration,
      startDate: this.parseToLocalDate(startDate),
      endDate: this.parseToLocalDate(endDate),
      sprintState: Number(this.sprintForm.sprintState ?? SprintState.todo) as SprintState,
      projectId,
    };

    this.error = '';
    this.success = '';
    this.sprintSubmitting = true;

    if (this.sprintFormMode === 'edit' && this.editingSprintId) {
      this.sprintService.updateSprint(this.editingSprintId, {
        id: this.editingSprintId,
        ...payload,
      }).pipe(finalize(() => (this.sprintSubmitting = false))).subscribe({
        next: () => {
          this.success = 'Sprint updated successfully.';
          this.cancelSprintForm();
          this.loadProjects();
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Unable to update sprint.';
        }
      });
      return;
    }

    this.sprintService.createSprint(payload)
      .pipe(finalize(() => (this.sprintSubmitting = false)))
      .subscribe({
        next: () => {
          this.success = 'Sprint created successfully.';
          this.cancelSprintForm();
          this.loadProjects();
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Unable to create sprint.';
        }
      });
  }

  deleteSprint(sprint: Sprint): void {
    const sprintId = Number(sprint.id ?? 0);
    if (!sprintId) {
      return;
    }

    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm(`Delete sprint "${sprint.name}"?`);
    if (!confirmed) {
      return;
    }

    this.error = '';
    this.success = '';
    this.sprintSubmitting = true;

    this.sprintService.deleteSprint(sprintId)
      .pipe(finalize(() => (this.sprintSubmitting = false)))
      .subscribe({
        next: () => {
          if (this.editingSprintId === sprintId) {
            this.cancelSprintForm();
          }
          this.success = 'Sprint deleted successfully.';
          this.loadProjects();
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Unable to delete sprint.';
        }
      });
  }

  getSprintStateLabel(state: SprintState): string {
    switch (state) {
      case SprintState.todo:
        return 'To Do';
      case SprintState.inProgress:
        return 'In Progress';
      case SprintState.done:
        return 'Done';
      case SprintState.validated:
        return 'Validated';
      case SprintState.pending:
      default:
        return 'Pending';
    }
  }

  getSprintStateClass(state: SprintState): string {
    if (state === SprintState.done || state === SprintState.validated) return 'state-done';
    if (state === SprintState.inProgress) return 'state-progress';
    return 'state-pending';
  }

  getSprintProjectName(sprint: Sprint): string {
    const project = this.selectedServiceProjects.find((item) => Number(item.id) === Number(sprint.projectId));
    return project?.name ?? `Project #${sprint.projectId}`;
  }

  getSelectedSprintProjectDate(type: 'start' | 'end'): string {
    const projectId = Number(this.sprintForm.projectId ?? 0);
    if (!projectId) {
      return '';
    }

    const project = this.selectedServiceProjects.find((item) => Number(item.id) === projectId);
    if (!project) {
      return '';
    }

    return type === 'start'
      ? this.toDateInput((project as any).startDate)
      : this.toDateInput((project as any).endDate);
  }

  closeUserStoryModal(): void {
    this.showUserStoryModal = false;
  }

  saveProfileSettings(): void {
    const firstName = this.profileForm.firstName.trim();
    const lastName = this.profileForm.lastName.trim();
    const email = this.profileForm.email.trim();
    const avatarUrl = this.profileForm.avatarUrl.trim();

    if (!firstName || !lastName || !email) {
      this.error = 'First name, last name, and email are required.';
      return;
    }

    const currentUserData = this.tokenService.getUserData();
    const userId = Number(currentUserData?.userId ?? currentUserData?.id ?? 0);
    const roleNumber = this.resolveRoleNumber(currentUserData?.role);

    if (!userId || !roleNumber) {
      this.error = 'Unable to identify your user account.';
      return;
    }

    this.profileSaving = true;
    this.error = '';
    this.success = '';

    this.userApiService.updateUser({
      id: userId,
      firstName,
      lastName,
      email,
      role: roleNumber,
    }).pipe(finalize(() => (this.profileSaving = false))).subscribe({
      next: () => {
        const applySuccess = () => {
          this.syncLocalUserProfile(firstName, lastName, email, avatarUrl || undefined);
          this.success = 'Profile updated successfully.';
          this.setUserProfile();
          this.cdr.detectChanges();
        };

        if (avatarUrl) {
          this.authService.updateProfileImage({ imageUrl: avatarUrl }).subscribe({
            next: () => applySuccess(),
            error: () => applySuccess(),
          });
          return;
        }

        applySuccess();
      },
      error: () => {
        this.error = 'Unable to update profile.';
      }
    });
  }

  savePasswordSettings(): void {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmNewPassword) {
      this.error = 'Please fill in all password fields.';
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.error = 'The new password must be at least 6 characters long.';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmNewPassword) {
      this.error = 'Password confirmation does not match.';
      return;
    }

    this.passwordSaving = true;
    this.error = '';
    this.success = '';

    this.authService.changePassword({
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword,
      confirmNewPassword: this.passwordForm.confirmNewPassword,
    }).pipe(finalize(() => (this.passwordSaving = false))).subscribe({
      next: () => {
        this.success = 'Password updated successfully.';
        this.passwordForm = {
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        };
      },
      error: (err: unknown) => {
        this.error = err instanceof Error ? err.message : 'Unable to change password.';
      }
    });
  }

  onProfileAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    if (!file) {
      this.profileAvatarFileName = '';
      this.profileAvatarPreviewUrl = '';
      input.value = '';
      this.cdr.markForCheck();
      return;
    }

    // Validate file type (image only)
    if (!file.type.startsWith('image/')) {
      this.error = 'Please select a valid image file (JPG, PNG, GIF, etc.).';
      this.profileAvatarFileName = '';
      this.profileAvatarPreviewUrl = '';
      input.value = '';
      this.cdr.markForCheck();
      return;
    }

    // Validate file size (max 5MB for images)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.error = 'The image must not exceed 5MB.';
      this.profileAvatarFileName = '';
      this.profileAvatarPreviewUrl = '';
      input.value = '';
      this.cdr.markForCheck();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.profileAvatarFileName = file.name;
      this.profileAvatarPreviewUrl = typeof reader.result === 'string' ? reader.result : '';
      this.profileForm.avatarUrl = this.profileAvatarPreviewUrl;
      this.error = '';
      this.cdr.markForCheck();
    };
    reader.onerror = () => {
      this.error = 'Unable to read the image file.';
      this.profileAvatarFileName = '';
      this.profileAvatarPreviewUrl = '';
      input.value = '';
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  clearProfileAvatar(): void {
    this.profileAvatarFileName = '';
    this.profileAvatarPreviewUrl = '';
    this.profileForm.avatarUrl = '';
    const fileInput = document.getElementById('profileAvatarInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.cdr.markForCheck();
  }

  submitCreateUserStory(): void {
    if (!this.selectedServiceProjects[0]?.id || !this.userStoryForm.sprintId || !this.userStoryForm.title.trim()) {
      this.error = 'Please fill in required user story fields.';
      return;
    }

    const selectedSprint = this.getSelectedSprint();
    if (!selectedSprint) {
      this.error = 'Selected sprint not found.';
      return;
    }

    const relatedProject = this.selectedServiceProjects.find(
      (project) => Number(project.id ?? 0) === Number(selectedSprint.projectId)
    ) ?? this.selectedServiceProjects[0];

    const sprintStartInput = this.toDateInput(selectedSprint.startDate);
    const sprintEndInput = this.toDateInput(selectedSprint.endDate);
    const projectStartInput = this.toDateInput(relatedProject?.startDate as Date | string | undefined);
    const projectEndInput = this.toDateInput(relatedProject?.endDate as Date | string | undefined);

    const startDateInput = this.maxDateString(projectStartInput, sprintStartInput);
    const endDateInput = this.minDateString(projectEndInput, sprintEndInput);

    if (!this.isDateInRange(startDateInput, projectStartInput, projectEndInput)
      || !this.isDateInRange(startDateInput, sprintStartInput, sprintEndInput)
      || !this.isDateInRange(endDateInput, projectStartInput, projectEndInput)
      || !this.isDateInRange(endDateInput, sprintStartInput, sprintEndInput)
      || endDateInput < startDateInput) {
      this.error = 'User story dates are outside sprint/project range.';
      return;
    }

    this.userStorySubmitting = true;
    this.error = '';

    const startDate = this.parseToLocalDate(startDateInput);
    const endDate = this.parseToLocalDate(endDateInput);
    const estimatedDuration = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

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
      estimatedDuration,
      userStoryState: 1,
      projectId: Number(relatedProject?.id ?? 0),
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
          this.error = 'Unable to create user story.';
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

  goToCurrentCalendarMonth(): void {
    const today = new Date();
    this.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.selectedCalendarDateIso = this.toIsoDateLocal(today);
    this.generateCalendar();
  }

  selectCalendarDay(iso: string): void {
    this.selectedCalendarDateIso = iso;
  }

  getTaskStatusLabel(status: TaskState): string {
    const normalized = this.normalizeTaskState(status);
    if (normalized === 'pending') return 'Pending';
    if (normalized === 'todo') return 'To Do';
    if (normalized === 'inProgress') return 'In Progress';
    if (normalized === 'done') return 'Done';
    if (normalized === 'validated') return 'Validated';
    return String(status);
  }

  getTaskAssigneeName(task: TaskDto): string {
    const assignedName = String((task as any)?.assignedToName ?? '').trim();
    if (assignedName) {
      return assignedName;
    }

    const assignedId = Number((task as any)?.assignedToId ?? 0);
    if (!assignedId) {
      return 'Unassigned';
    }

    const member = this.selectedServiceMembers.find((item) => Number(item.userId) === assignedId);
    const memberName = `${member?.user?.firstName ?? ''} ${member?.user?.lastName ?? ''}`.trim();
    return memberName || `User #${assignedId}`;
  }

  getUserStoryName(userStoryId: number): string {
    const story = this.serviceUserStories.find((item) => Number(item.id) === Number(userStoryId));
    return story?.name || story?.title || `US #${userStoryId}`;
  }

  getCalendarTaskStateClass(status: TaskState): string {
    const normalized = this.normalizeTaskState(status);

    if (normalized === 'validated') {
      return 'cal-task-validated';
    }
    if (normalized === 'done') {
      return 'cal-task-done';
    }
    if (normalized === 'inProgress') {
      return 'cal-task-in-progress';
    }
    if (normalized === 'todo') {
      return 'cal-task-todo';
    }

    return 'cal-task-pending';
  }

  formatDate(value?: Date | string): string {
    if (!value) {
      return '-';
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      const datePart = trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
      if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        return new Date(year, month - 1, day).toLocaleDateString('en-US');
      }
    }

    return new Date(value).toLocaleDateString('en-US');
  }

  getServiceStatus(_service: Service): 'Active' {
    return 'Active';
  }

  getServiceAvatars(service: Service): string[] {
    if (this.areSameIds(this.selectedServiceId, service.id) && this.teamRows.length > 0) {
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
    const serviceId = this.normalizeId(service.id);
    if (serviceId === null) return 0;

    return this.allProjects.filter((project) => {
      const projectServiceId = this.getProjectServiceId(project);
      if (this.areSameIds(projectServiceId, serviceId)) {
        return true;
      }

      const projectTeamId = this.getProjectTeamId(project);
      if (projectTeamId === null) {
        return false;
      }

      return this.serviceTeams.some((team) => this.areSameIds(team.id, projectTeamId) && this.areSameIds(this.getTeamServiceId(team), serviceId));
    }).length;
  }

  getMembersCountForService(service: Service): number {
    if (!service?.id) return 0;
    const serviceId = this.normalizeId(service.id);
    if (serviceId === null) return 0;

    if (this.areSameIds(this.selectedServiceId, serviceId) && this.selectedServiceMemberIds.size > 0) {
      return this.selectedServiceMemberIds.size;
    }

    const teamIds = this.serviceTeams
      .filter((team) => this.areSameIds(this.getTeamServiceId(team), serviceId))
      .map((team) => team.id);

    const ids = new Set<number>();

    if (teamIds.length > 0) {
      this.selectedServiceMembers.forEach((member) => {
        if (teamIds.includes(member.teamId) && typeof member.userId === 'number') {
          ids.add(member.userId);
        }
      });
    }

    this.serviceUsers.forEach((user) => {
      if (!this.areSameIds(this.getUserServiceId(user), serviceId)) return;
      const userId = this.normalizeId(user.id);
      if (userId !== null) ids.add(userId);
    });

    return ids.size;
  }

  hasTeamsForService(service: Service): boolean {
    if (!service?.id) return false;
    const serviceId = this.normalizeId(service.id);
    if (serviceId === null) return false;

    return this.serviceTeams.some((team) => this.areSameIds(this.getTeamServiceId(team), serviceId));
  }

  getResponsibleLabel(service: Service): string {
    if (!service?.responsibleId) return 'Unassigned';

    if (this.areSameIds(service.responsibleId, this.currentResponsibleId) && this.userName.trim()) {
      return this.userName;
    }

    const serviceUser = this.serviceUsers.find((user) =>
      this.areSameIds(user.id, service.responsibleId)
    );
    if (serviceUser) {
      const fullName = `${serviceUser.firstName ?? ''} ${serviceUser.lastName ?? ''}`.trim();
      if (fullName) return fullName;
    }

    const manager = this.selectedServiceMembers.find((member) => member.userId === service.responsibleId)?.user;
    if (manager) return `${manager.firstName} ${manager.lastName}`.trim();
    return `User #${service.responsibleId}`;
  }

  getProjectStatusLabel(project: ProjectEntity): string {
    const state = Number(project.projectState);
    if (state === ProjectState.done || state === ProjectState.validated) return 'Done';
    if (state === ProjectState.inProgress) return 'Active';
    if (state === ProjectState.todo) return 'Planned';
    return 'Pending';
  }

  getProjectStatusClass(project: ProjectEntity): string {
    const state = Number(project.projectState);
    if (state === ProjectState.done || state === ProjectState.validated) return 'done';
    if (state === ProjectState.inProgress) return 'active';
    if (state === ProjectState.todo) return 'todo';
    return 'pending';
  }

  getProjectProgress(project: ProjectEntity): number {
    const projectId = Number(project.id ?? 0);
    const stories = this.serviceUserStories.filter((story) => Number((story as any)?.projectId ?? 0) === projectId);
    const projectStoryIds = new Set(stories.map((story) => Number(story.numericId ?? story.id ?? 0)).filter((id) => id > 0));
    const projectTasks = this.serviceTasks.filter((task) => projectStoryIds.has(Number(task.userStoryId ?? 0)));

    if (projectTasks.length > 0) {
      const completedTasks = projectTasks.filter((task) => {
        const state = this.normalizeTaskState(task.status);
        return state === 'done' || state === 'validated';
      }).length;

      return Math.round((completedTasks / projectTasks.length) * 100);
    }

    if (stories.length > 0) {
      const completedStories = stories.filter((story) => {
        const statusText = String(story?.status ?? '').toLowerCase();
        const stateValue = Number((story as any)?.userStoryState ?? -1);
        return statusText.includes('done') || stateValue === 3 || stateValue === 4;
      }).length;

      return Math.round((completedStories / stories.length) * 100);
    }

    const state = Number(project.projectState);
    if (state === ProjectState.done || state === ProjectState.validated) return 100;
    if (state === ProjectState.inProgress) return 65;
    if (state === ProjectState.todo) return 30;
    return 10;
  }

  getProjectTeamLabel(project: ProjectEntity): string {
    const teamId = this.normalizeId((project as any).teamId ?? (project as any).TeamId ?? project.teamId);
    if (!teamId) return 'No team assigned';

    const team = this.selectedServiceTeams.find((item) => Number(item.id) === teamId);
    return team?.name ?? `Team #${teamId}`;
  }

  getProjectTeamMembers(project: ProjectEntity): TeamUser[] {
    const teamId = this.normalizeId((project as any).teamId ?? (project as any).TeamId ?? project.teamId);
    if (!teamId) return [];
    return this.selectedServiceMembers.filter((member) => Number(member.teamId) === teamId);
  }

  getProjectSprintCount(project: ProjectEntity): number {
    const projectId = Number(project.id ?? 0);
    if (!projectId) return 0;
    return this.availableSprints.filter((sprint) => Number(sprint.projectId) === projectId).length;
  }

  getProjectMemberCount(project: ProjectEntity): number {
    return this.getProjectTeamMembers(project).length;
  }

  getProjectNameByUserStory(story: ServiceUserStoryRow): string {
    const projectId = Number((story as any)?.projectId ?? 0);
    if (!projectId) return '-';
    const project = this.selectedServiceProjects.find((item) => Number(item.id) === projectId);
    return project?.name ?? `Project #${projectId}`;
  }

  getSprintNameByUserStory(story: ServiceUserStoryRow): string {
    const sprintId = Number(story?.sprintId ?? 0);
    if (!sprintId) return '-';
    const sprint = this.availableSprints.find((item) => Number(item.id) === sprintId);
    return sprint?.name ?? `Sprint #${sprintId}`;
  }

  getProjectMemberRoleLabel(member: TeamUser): string {
    if (member.role === 1) {
      return 'Project Leader';
    }

    if (member.role === 0) {
      return 'Employee';
    }

    return 'Team Member';
  }

  getUserStoryStatusLabel(status: UserStoryStateValue | undefined): string {
    return this.userStoryStatuses.find((item) => item.value === this.normalizeUserStoryStatus(status))?.label ?? 'To Do';
  }

  getComputedUserStoryStatus(story: ServiceUserStoryRow): UserStoryStatus {
    const storyTasks = this.serviceTasks.filter((task) => Number(task.userStoryId ?? 0) === story.numericId);
    if (storyTasks.length === 0) {
      return this.resolveStoryStatus(story);
    }

    let hasTodo = false;
    let hasInProgress = false;
    let hasCompleted = false;

    storyTasks.forEach((task) => {
      const state = this.normalizeTaskState(task.status);
      if (state === 'done' || state === 'validated') {
        hasCompleted = true;
        return;
      }

      if (state === 'inProgress') {
        hasInProgress = true;
        return;
      }

      hasTodo = true;
    });

    if (!hasTodo && !hasInProgress && hasCompleted) {
      return UserStoryStatus.DONE;
    }

    if (hasInProgress || (hasCompleted && hasTodo)) {
      return UserStoryStatus.IN_PROGRESS;
    }

    return UserStoryStatus.TODO;
  }

  getUserStoryStatusClass(status: UserStoryStateValue | undefined): string {
    const normalized = this.normalizeUserStoryStatus(status);
    if (normalized === UserStoryStatus.DONE) return 'done';
    if (normalized === UserStoryStatus.IN_PROGRESS) return 'active';
    if (normalized === UserStoryStatus.REVIEW || normalized === UserStoryStatus.TESTING) return 'review';
    return 'todo';
  }

  getSelectedUserStoryStatus(story: ServiceUserStoryRow): UserStoryStateValue {
    return this.selectedUserStoryStatuses[story.numericId] ?? this.resolveStoryStatus(story);
  }

  setSelectedUserStoryStatus(storyId: string, status: UserStoryStateValue): void {
    const numericId = Number(storyId);
    if (!Number.isFinite(numericId) || numericId <= 0) return;
    this.selectedUserStoryStatuses[numericId] = status;
  }

  saveUserStoryStatus(story: ServiceUserStoryRow): void {
    const newStatus = this.getSelectedUserStoryStatus(story);
    if (this.normalizeUserStoryStatus(newStatus) === this.resolveStoryStatus(story)) return;

    this.userStoryService.updateStatus(story.numericId, newStatus).subscribe({
      next: () => {
        this.loadServiceUserStories();
      },
      error: () => {
        this.error = 'Unable to update user story status.';
      }
    });
  }

  private normalizeUserStoryStatus(status: UserStoryStateValue | undefined): UserStoryStatus {
    if (status === null || status === undefined) {
      return UserStoryStatus.TODO;
    }

    const numericStatus = Number(status);
    if (Number.isFinite(numericStatus)) {
      if (numericStatus <= 1) return UserStoryStatus.TODO;
      if (numericStatus === 2) return UserStoryStatus.IN_PROGRESS;
      if (numericStatus === 3 || numericStatus === 4) return UserStoryStatus.DONE;
      return UserStoryStatus.TODO;
    }

    const normalized = String(status).trim().toLowerCase();
    if (normalized === 'to do' || normalized === 'todo' || normalized === 'pending') return UserStoryStatus.TODO;
    if (normalized === 'in progress' || normalized === 'inprogress') return UserStoryStatus.IN_PROGRESS;
    if (normalized === 'review') return UserStoryStatus.REVIEW;
    if (normalized === 'testing') return UserStoryStatus.TESTING;
    if (normalized === 'done' || normalized === 'validated') return UserStoryStatus.DONE;
    return UserStoryStatus.TODO;
  }

  private resolveStoryStatus(story: ServiceUserStoryRow): UserStoryStatus {
    return this.normalizeUserStoryStatus(story.status ?? (story as any)?.userStoryState);
  }

  private getRoleLabel(role: unknown, isManager: boolean): string {
    if (isManager) {
      return 'Service Manager';
    }

    const normalized = String(role ?? '').trim().toLowerCase();
    if (normalized === '1' || normalized === 'projectleader' || normalized === 'project leader') {
      return 'Project Leader';
    }
    if (normalized === '0' || normalized === 'employer' || normalized === 'employee') {
      return 'Employee';
    }

    return 'Employee';
  }

  private getRoleClass(role: unknown, isManager: boolean): string {
    if (isManager) {
      return 'role-manager';
    }

    const normalized = String(role ?? '').trim().toLowerCase();
    if (normalized === '1' || normalized === 'projectleader' || normalized === 'project leader') {
      return 'role-lead';
    }

    return 'role-employee';
  }

  private setCurrentDate(): void {
    this.currentDateLabel = new Date().toLocaleDateString('en-US', {
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
    this.profileImageUrl = String((userData as any)?.profileImageUrl ?? '').trim();
  }

  private loadUserSettings(): void {
    const userData = this.tokenService.getUserData();
    this.profileForm = {
      firstName: String(userData?.firstName ?? '').trim(),
      lastName: String(userData?.lastName ?? '').trim(),
      email: String(userData?.email ?? '').trim(),
      avatarUrl: String((userData as any)?.profileImageUrl ?? '').trim(),
    };

    this.authService.getProfile().pipe(catchError(() => of(null))).subscribe((profile) => {
      if (!profile) {
        return;
      }

      this.profileForm = {
        firstName: String(profile.firstName ?? this.profileForm.firstName).trim(),
        lastName: String(profile.lastName ?? this.profileForm.lastName).trim(),
        email: String(profile.email ?? this.profileForm.email).trim(),
        avatarUrl: String(profile.profileImageUrl ?? this.profileForm.avatarUrl).trim(),
      };

      this.profileImageUrl = this.profileForm.avatarUrl;
      this.syncLocalUserProfile(this.profileForm.firstName, this.profileForm.lastName, this.profileForm.email, this.profileForm.avatarUrl || undefined);
      this.cdr.detectChanges();
    });
  }

  private resolveRoleNumber(role: string | number | undefined): number | null {
    if (typeof role === 'number') {
      return role;
    }

    const normalized = String(role ?? '').trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'admin' || normalized === '0') return 0;
    if (normalized === 'servicemanager' || normalized === 'service manager' || normalized === '1') return 1;
    if (normalized === 'projectmanager' || normalized === 'project manager' || normalized === '2') return 2;
    if (normalized === 'employee' || normalized === 'employe' || normalized === '3') return 3;
    return null;
  }

  private syncLocalUserProfile(firstName: string, lastName: string, email: string, profileImageUrl?: string): void {
    const current = this.tokenService.getUserData();
    const accessToken = this.tokenService.getAccessToken();
    if (!current || !accessToken) {
      return;
    }

    const merged = {
      ...current,
      firstName,
      lastName,
      email,
      profileImageUrl: profileImageUrl ?? (current as any)?.profileImageUrl,
    };

    this.tokenService.setTokens(accessToken, this.tokenService.getRefreshToken(), merged);
    this.profileImageUrl = String((merged as any)?.profileImageUrl ?? '').trim();
  }

  private generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const calendarStartDate = new Date(year, month, 1 - startOffset);

    const today = new Date();
    this.calendarDays = [];

    for (let index = 0; index < totalCells; index++) {
      const cellDate = this.addDays(calendarStartDate, index);
      const inCurrentMonth = cellDate.getMonth() === month && cellDate.getFullYear() === year;
      const dayNumber = cellDate.getDate();
      const isToday = dayNumber === today.getDate()
        && cellDate.getMonth() === today.getMonth()
        && cellDate.getFullYear() === today.getFullYear();
      const iso = this.toIsoDateLocal(cellDate);

      this.calendarDays.push({
        day: dayNumber,
        iso,
        isToday,
        inCurrentMonth,
        hasProject: false,
        projectDeadlineCount: 0,
        hasTask: false,
        taskCount: 0,
      });
    }

    const projectDeadlineCountByIso: Record<string, number> = {};
    this.selectedServiceProjects.forEach((project) => {
      const deadlineIso = this.getSafeIsoDate(project.endDate as Date | string | null | undefined);
      if (!deadlineIso) {
        return;
      }

      projectDeadlineCountByIso[deadlineIso] = (projectDeadlineCountByIso[deadlineIso] ?? 0) + 1;
    });

    const taskCountByIso: Record<string, number> = {};
    this.serviceTasks.forEach((task) => {
      const startIso = this.getSafeIsoDate(task.startDate);
      const endIso = this.getSafeIsoDate(task.endDate);
      if (!startIso || !endIso) {
        return;
      }

      let current = this.parseToLocalDate(startIso);
      const end = this.parseToLocalDate(endIso);
      if (end < current) {
        return;
      }

      while (current <= end) {
        const iso = this.toIsoDateLocal(current);
        taskCountByIso[iso] = (taskCountByIso[iso] ?? 0) + 1;
        current = this.addDays(current, 1);
      }
    });

    this.calendarDays = this.calendarDays.map((cell) => {
      if (!cell.inCurrentMonth) return cell;
      const cellDate = new Date(year, month, cell.day);
      const iso = this.toIsoDateLocal(cellDate);
      const projectDeadlineCount = projectDeadlineCountByIso[iso] ?? 0;
      const taskCount = taskCountByIso[iso] ?? 0;
      return {
        ...cell,
        hasProject: projectDeadlineCount > 0,
        projectDeadlineCount,
        hasTask: taskCount > 0,
        taskCount
      };
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

  private loadUsersForSelectedService(): void {
    if (!this.selectedServiceId) {
      this.serviceUsers = [];
      return;
    }

    this.userApiService.getUsers()
      .pipe(catchError(() => of([] as Array<{ id?: number | string; serviceId?: number | string }>)))
      .subscribe((users) => {
        this.serviceUsers = (users ?? []) as Array<{ id?: number | string; firstName?: string; lastName?: string; email?: string; serviceId?: number | string }>;
        this.cdr.detectChanges();
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
        this.cdr.detectChanges();
      },
      error: () => {
        this.selectedServiceMemberIds = new Set<number>();
        this.selectedServiceMembers = [];
        this.cdr.detectChanges();
      }
    });
  }

  private loadProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.allProjects = projects ?? [];
        const serviceProjects = this.selectedServiceProjects;
        if (serviceProjects.length > 0) {
          const selectedProjectStillExists = serviceProjects.some((project) => Number(project.id) === Number(this.selectedProjectId));
          if (!selectedProjectStillExists) {
            this.selectedProjectId = Number(serviceProjects[0].id);
          }
        } else {
          this.selectedProjectId = null;
        }

        const projectIds = serviceProjects
          .map((project) => Number(project.id ?? 0))
          .filter((id) => id > 0);

        if (projectIds.length === 0) {
          this.availableSprints = [];
          this.serviceTasks = [];
          this.serviceUserStories = [];
          this.selectedUserStoryStatuses = {};
          this.generateCalendar();
          this.recomputeNotificationsView();
          return;
        }

        const sprintsRequests = projectIds.map((projectId) =>
          this.sprintService.getSprintsByProjectId(projectId).pipe(catchError(() => of([] as Sprint[])))
        );
        const storiesRequests = projectIds.map((projectId) =>
          this.userStoryService.getByProjectId(projectId).pipe(catchError(() => of([] as UserStoryDto[])))
        );

        forkJoin({
          sprintsByProject: forkJoin(sprintsRequests),
          storiesByProject: forkJoin(storiesRequests),
          tasks: this.taskService.getAll().pipe(catchError(() => of([] as TaskDto[])))
        }).subscribe({
          next: ({ sprintsByProject, storiesByProject, tasks }) => {
            this.availableSprints = sprintsByProject.flat();
            const sprintIds = new Set(this.availableSprints.map((sprint) => Number(sprint.id)));

            const flattenedStories = storiesByProject.flat();
            this.serviceUserStories = flattenedStories
              .map((story) => ({ ...story, numericId: Number(story.id) }))
              .filter((story) => Number.isFinite(story.numericId) && story.numericId > 0);

            const userStoryIds = new Set(this.serviceUserStories.map((story) => Number(story.numericId)));

            this.selectedUserStoryStatuses = {};
            this.serviceUserStories.forEach((story) => {
              this.selectedUserStoryStatuses[story.numericId] = this.resolveStoryStatus(story);
            });

            this.serviceTasks = (tasks ?? []).filter((task) => {
              const sprintId = Number(task.sprintId ?? 0);
              const userStoryId = Number(task.userStoryId ?? 0);
              return sprintIds.has(sprintId) || userStoryIds.has(userStoryId);
            });

            this.syncUserStoryStatusesFromTasks();

            this.generateCalendar();
            this.recomputeNotificationsView();
            this.cdr.detectChanges();
          },
          error: () => {
            this.availableSprints = [];
            this.serviceTasks = [];
            this.serviceUserStories = [];
            this.selectedUserStoryStatuses = {};
            this.generateCalendar();
            this.recomputeNotificationsView();
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.allProjects = [];
        this.availableSprints = [];
        this.serviceTasks = [];
        this.serviceUserStories = [];
        this.recomputeNotificationsView();
      }
    });
  }

  private loadServiceUserStories(): void {
    const projectIds = this.selectedServiceProjects
      .map((project) => project.id)
      .filter((id): id is number => typeof id === 'number' && id > 0);

    if (projectIds.length === 0) {
      this.serviceUserStories = [];
      this.serviceTasks = [];
      this.selectedUserStoryStatuses = {};
      this.recomputeNotificationsView();
      return;
    }

    const storyRequests = projectIds.map((projectId) =>
      this.userStoryService.getByProjectId(projectId).pipe(catchError(() => of([] as UserStoryDto[])))
    );

    forkJoin({
      storiesByProject: forkJoin(storyRequests),
      tasks: this.taskService.getAll().pipe(catchError(() => of([] as TaskDto[])))
    }).subscribe({
      next: ({ storiesByProject, tasks }) => {
        const flattened = storiesByProject.flat();
        this.serviceUserStories = flattened
          .map((story) => ({ ...story, numericId: Number(story.id) }))
          .filter((story) => Number.isFinite(story.numericId) && story.numericId > 0);

        const userStoryIds = new Set(this.serviceUserStories.map((story) => Number(story.numericId)));
        this.serviceTasks = (tasks ?? []).filter((task) => userStoryIds.has(Number(task.userStoryId ?? 0)));

        this.selectedUserStoryStatuses = {};
        this.serviceUserStories.forEach((story) => {
          this.selectedUserStoryStatuses[story.numericId] = this.resolveStoryStatus(story);
        });

        this.syncUserStoryStatusesFromTasks();
        this.recomputeNotificationsView();
        this.cdr.detectChanges();
      },
      error: () => {
        this.serviceUserStories = [];
        this.serviceTasks = [];
        this.recomputeNotificationsView();
        this.cdr.detectChanges();
      }
    });
  }

  private syncUserStoryStatusesFromTasks(): void {
    if (this.serviceUserStories.length === 0 || this.serviceTasks.length === 0) {
      return;
    }

    this.serviceUserStories.forEach((story) => {
      const computedStatus = this.getComputedUserStoryStatus(story);
      const currentStatus = this.resolveStoryStatus(story);

      if (computedStatus === currentStatus) {
        return;
      }

      story.status = computedStatus;
      story.userStoryState = this.toUserStoryStateNumber(computedStatus);
      this.selectedUserStoryStatuses[story.numericId] = computedStatus;

      this.userStoryService.updateStatus(story.numericId, computedStatus)
        .pipe(catchError(() => of(void 0)))
        .subscribe();
    });
  }

  private toUserStoryStateNumber(status: UserStoryStatus): number {
    if (status === UserStoryStatus.DONE) {
      return 3;
    }

    if (status === UserStoryStatus.IN_PROGRESS || status === UserStoryStatus.REVIEW || status === UserStoryStatus.TESTING) {
      return 2;
    }

    return 1;
  }

  private initializeNotifications(): void {
    this.notificationCountSubscription?.unsubscribe();
    this.notificationsSubscription?.unsubscribe();

    this.notificationCountSubscription = this.notificationService.unreadCount$.subscribe(() => {
      this.recomputeNotificationsView();
      this.cdr.markForCheck();
    });

    this.notificationsSubscription = this.notificationService.notifications$.subscribe((items) => {
      this.apiNotifications = items;
      this.recomputeNotificationsView();
      this.cdr.markForCheck();
    });

    this.refreshNotifications();
  }

  private refreshNotifications(): void {
    const userId = this.resolveCurrentResponsibleId();
    if (!userId) {
      this.apiNotifications = [];
      this.recomputeNotificationsView();
      this.cdr.markForCheck();
      return;
    }

    this.notificationService.loadNotifications(userId);
  }

  private recomputeNotificationsView(): void {
    const overdueNotifications = this.buildOverdueNotifications();
    const merged = [...overdueNotifications, ...(this.apiNotifications ?? [])]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    this.notifications = merged;
    this.notificationCount = merged.filter((item) => !item.isRead).length;
  }

  private buildOverdueNotifications(): AppNotification[] {
    const todayIso = this.toIsoDateLocal(new Date());
    const nowIso = new Date().toISOString();
    const alerts: AppNotification[] = [];

    this.selectedServiceProjects.forEach((project) => {
      const deadlineIso = this.getSafeIsoDate(project.endDate as Date | string | null | undefined);
      if (!deadlineIso || deadlineIso >= todayIso) {
        return;
      }

      const projectState = Number(project.projectState);
      const isDone = projectState === ProjectState.done || projectState === ProjectState.validated;
      if (isDone) {
        return;
      }

      const key = `project:${Number(project.id ?? 0)}:${deadlineIso}`;
      const read = this.acknowledgedOverdueNotificationKeys.has(key);

      alerts.push({
        id: this.toLocalOverdueNotificationId(key),
        title: 'Project overdue',
        message: `Project "${project.name}" is overdue since ${deadlineIso} and is not finished.`,
        type: NotificationType.TaskOverdue,
        isRead: read,
        createdAt: nowIso,
        link: `local-overdue:${key}`,
      });
    });

    this.serviceTasks.forEach((task) => {
      const deadlineIso = this.getSafeIsoDate(task.endDate);
      if (!deadlineIso || deadlineIso >= todayIso) {
        return;
      }

      const state = this.normalizeTaskState(task.status);
      const isDone = state === 'done' || state === 'validated';
      if (isDone) {
        return;
      }

      const key = `task:${Number(task.id ?? 0)}:${deadlineIso}`;
      const read = this.acknowledgedOverdueNotificationKeys.has(key);

      alerts.push({
        id: this.toLocalOverdueNotificationId(key),
        title: 'Task overdue',
        message: `Task "${task.title}" is overdue since ${deadlineIso} and is not finished.`,
        type: NotificationType.TaskOverdue,
        isRead: read,
        createdAt: nowIso,
        relatedTaskId: Number(task.id ?? 0),
        link: `local-overdue:${key}`,
      });
    });

    return alerts;
  }

  private isLocalOverdueNotification(notification: AppNotification): boolean {
    return String(notification.link ?? '').startsWith('local-overdue:');
  }

  private extractOverdueNotificationKey(notification: AppNotification): string {
    const link = String(notification.link ?? '');
    return link.startsWith('local-overdue:') ? link.slice('local-overdue:'.length) : '';
  }

  private toLocalOverdueNotificationId(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }

    const id = Math.abs(hash) + 1;
    return -id;
  }

  private resolveCurrentResponsibleId(): number | null {
    const userData = this.tokenService.getUserData();
    const userId = Number(userData?.userId ?? userData?.id ?? 0);
    return Number.isFinite(userId) && userId > 0 ? userId : null;
  }

  private getSelectedSprint(): Sprint | undefined {
    return this.availableSprints.find((sprint) => Number(sprint.id) === Number(this.userStoryForm.sprintId));
  }

  private normalizeTaskState(status: TaskState): TaskState {
    const mapByNumber: Record<number, TaskState> = {
      0: 'pending',
      1: 'todo',
      2: 'inProgress',
      3: 'done',
      4: 'validated',
    };

    if (typeof status === 'number') {
      return mapByNumber[status] ?? 'pending';
    }

    if (typeof status === 'string') {
      const normalized = status.trim().toLowerCase();
      if (normalized === 'inprogress') {
        return 'inProgress';
      }
    }

    return status;
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  private resetProjectForm(): void {
    const defaultStart = this.toIsoDateLocal(new Date());
    const defaultEnd = this.toIsoDateLocal(this.addDays(new Date(), 29));

    this.projectForm = {
      name: '',
      description: '',
      startDate: defaultStart,
      endDate: defaultEnd,
      estimatedDuration: this.calculateProjectDuration(defaultStart, defaultEnd),
      projectState: ProjectState.todo,
      teamId: this.selectedServiceTeams[0]?.id ?? null,
    };
  }

  private calculateProjectDuration(startDate: string, endDate: string): number {
    if (!startDate || !endDate) {
      return 1;
    }

    const start = this.parseToLocalDate(startDate);
    const end = this.parseToLocalDate(endDate);
    const diff = end.getTime() - start.getTime();
    if (!Number.isFinite(diff) || diff < 0) {
      return 1;
    }

    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  }

  private resetSprintForm(): void {
    const defaultStart = this.toIsoDateLocal(new Date());
    const defaultEnd = this.toIsoDateLocal(this.addDays(new Date(), 13));

    this.sprintForm = {
      name: '',
      description: '',
      projectId: null,
      startDate: defaultStart,
      endDate: defaultEnd,
      estimatedDuration: this.calculateSprintDuration(defaultStart, defaultEnd),
      sprintState: SprintState.todo,
    };
  }

  private calculateSprintDuration(startDate: string, endDate: string): number {
    if (!startDate || !endDate) {
      return 1;
    }

    const start = this.parseToLocalDate(startDate);
    const end = this.parseToLocalDate(endDate);
    const diff = end.getTime() - start.getTime();
    if (!Number.isFinite(diff) || diff < 0) {
      return 1;
    }

    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  }

  private toDateInput(value?: Date | string): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length >= 10) {
        const datePart = trimmed.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          return datePart;
        }
      }
    }

    const dateObj = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateObj.getTime())) {
      return '';
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private minDateString(first?: string, second?: string): string {
    if (!first) return second ?? '';
    if (!second) return first;
    return first <= second ? first : second;
  }

  private maxDateString(first?: string, second?: string): string {
    if (!first) return second ?? '';
    if (!second) return first;
    return first >= second ? first : second;
  }

  private isDateInRange(value: string, minDate?: string, maxDate?: string): boolean {
    if (!value) return false;
    if (minDate && value < minDate) return false;
    if (maxDate && value > maxDate) return false;
    return true;
  }

  private parseToLocalDate(isoDate: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
    if (!match) {
      return new Date();
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(year, month, day);
  }

  private getSafeIsoDate(value?: Date | string | null): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length >= 10) {
        const datePart = trimmed.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          return datePart;
        }
      }
    }

    const candidate = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(candidate.getTime())) {
      return '';
    }

    return this.toIsoDateLocal(candidate);
  }

  private toIsoDateLocal(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getProjectServiceId(project: ProjectEntity): number | null {
    const typedProject = project as ProjectEntity & {
      ServiceId?: number | string;
      serviceID?: number | string;
      serviceid?: number | string;
      Serviceid?: number | string;
      service?: { id?: number | string } | number | string;
      Service?: { id?: number | string } | number | string;
    };

    const rawValue = typedProject.serviceId
      ?? typedProject.ServiceId
      ?? typedProject.serviceID
      ?? typedProject.serviceid
      ?? typedProject.Serviceid
      ?? (typeof typedProject.service === 'object' ? typedProject.service?.id : typedProject.service)
      ?? (typeof typedProject.Service === 'object' ? typedProject.Service?.id : typedProject.Service);

    return this.normalizeId(rawValue);
  }

  private getTeamServiceId(team: TeamEntity): number | null {
    const typedTeam = team as TeamEntity & {
      ServiceId?: number | string;
      serviceID?: number | string;
      serviceid?: number | string;
      Serviceid?: number | string;
      service?: { id?: number | string } | number | string;
      Service?: { id?: number | string } | number | string;
    };

    const rawValue = typedTeam.serviceId
      ?? typedTeam.ServiceId
      ?? typedTeam.serviceID
      ?? typedTeam.serviceid
      ?? typedTeam.Serviceid
      ?? (typeof typedTeam.service === 'object' ? typedTeam.service?.id : typedTeam.service)
      ?? (typeof typedTeam.Service === 'object' ? typedTeam.Service?.id : typedTeam.Service);

    return this.normalizeId(rawValue);
  }

  private getProjectTeamId(project: ProjectEntity): number | null {
    const typedProject = project as ProjectEntity & {
      TeamId?: number | string;
      teamID?: number | string;
      teamid?: number | string;
      Team?: { id?: number | string } | number | string;
      team?: { id?: number | string } | number | string;
    };

    const rawValue = typedProject.teamId
      ?? typedProject.TeamId
      ?? typedProject.teamID
      ?? typedProject.teamid
      ?? (typeof typedProject.team === 'object' ? typedProject.team?.id : typedProject.team)
      ?? (typeof typedProject.Team === 'object' ? typedProject.Team?.id : typedProject.Team);

    return this.normalizeId(rawValue);
  }

  private getUserServiceId(user: { serviceId?: number | string }): number | null {
    const typedUser = user as {
      serviceId?: number | string;
      ServiceId?: number | string;
      serviceid?: number | string;
      Serviceid?: number | string;
      service?: { id?: number | string } | number | string;
      Service?: { id?: number | string } | number | string;
    };

    const rawValue = typedUser.serviceId
      ?? typedUser.ServiceId
      ?? typedUser.serviceid
      ?? typedUser.Serviceid
      ?? (typeof typedUser.service === 'object' ? typedUser.service?.id : typedUser.service)
      ?? (typeof typedUser.Service === 'object' ? typedUser.Service?.id : typedUser.Service);

    return this.normalizeId(rawValue);
  }

  private belongsToSelectedService(project: ProjectEntity): boolean {
    if (!this.selectedServiceId) return false;

    const selectedServiceId = this.normalizeId(this.selectedServiceId);
    if (selectedServiceId === null) return false;

    const projectServiceId = this.getProjectServiceId(project);
    if (this.areSameIds(projectServiceId, selectedServiceId)) return true;

    const projectTeamId = this.getProjectTeamId(project);
    if (projectTeamId === null) return false;

    return this.serviceTeams.some((team) =>
      this.areSameIds(team.id, projectTeamId) && this.areSameIds(this.getTeamServiceId(team), selectedServiceId)
    );
  }

  private normalizeId(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  private areSameIds(left: unknown, right: unknown): boolean {
    const leftId = this.normalizeId(left);
    const rightId = this.normalizeId(right);
    return leftId !== null && rightId !== null && leftId === rightId;
  }
}