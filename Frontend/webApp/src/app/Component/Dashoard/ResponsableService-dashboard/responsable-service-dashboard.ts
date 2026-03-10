import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { AuthService } from '../../Auth/Service/auth.service';
import { TokenService } from '../../Auth/Service/token.service';
import { ProjectService, State as ProjectState, project as ProjectEntity } from '../../Page/Projet/Service/ProjectService';
import { Sprint, SprintService } from '../../Page/Sprint/Service/SprintService';
import { TaskDto, TaskService, TaskState } from '../../Page/Task/Service/TaskService';
import { Team as TeamEntity, TeamService, TeamUser } from '../../Page/Team/Service/TeamService';
import { CreateServiceDto, Service, ServiceService } from '../../Page/Team/Service/ServiceService';
import { UserApiService } from '../../Page/Team/Service/UserApiService';
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
  private authService = inject(AuthService);
  private serviceApi = inject(ServiceService);
  private teamService = inject(TeamService);
  private projectService = inject(ProjectService);
  private sprintService = inject(SprintService);
  private taskService = inject(TaskService);
  private userStoryService = inject(UserStoryService);
  private userApiService = inject(UserApiService);
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private cdr = inject(ChangeDetectorRef);

  private currentResponsibleId: number | null = null;

  activeSection: 'services' | 'calendar' = 'services';
  serviceViewMode: 'list' | 'detail' = 'list';
  activeTab: 'dashboard' | 'projects' | 'userStories' | 'teamMembers' | 'calendar' | 'settings' = 'dashboard';

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

  showCreateModal = false;
  serviceSubmitting = false;
  serviceModalMode: 'create' | 'edit' = 'create';
  newService: CreateServiceDto = { name: '', responsibleId: undefined };
  editingServiceId: number | null = null;

  currentDateLabel = '';
  userName = '';
  userRole = '';
  notificationCount = 0;
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

  profileSaving = false;
  passwordSaving = false;
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
  }

  get pageTitle(): string {
    if (this.activeSection === 'calendar') return 'Calendar';
    if (this.serviceViewMode === 'detail') return 'Mon Service';
    return 'Gestion des Services';
  }

  get calendarTitle(): string {
    return this.currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  get selectedCalendarDateLabel(): string {
    const selectedDate = this.parseToLocalDate(this.selectedCalendarDateIso);
    return selectedDate.toLocaleDateString('fr-FR', {
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
      const matchesStatus = this.statusFilter === 'all' || this.getServiceStatus(service) === 'Actif';
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
        subtitle: isManager ? 'Chef de service' : undefined,
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
    return this.serviceUserStories.filter((story) => story.status === UserStoryStatus.DONE).length;
  }

  get inProgressUserStoriesCount(): number {
    return this.serviceUserStories.filter((story) => story.status === UserStoryStatus.IN_PROGRESS).length;
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

  loadServices(): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    this.currentResponsibleId = this.resolveCurrentResponsibleId();

    if (this.currentResponsibleId === null) {
      this.loading = false;
      this.error = 'Service manager user not identified.';
      this.services = [];
      return;
    }

    this.serviceApi.getServices()
      .pipe(
        timeout(10000),
        finalize(() => (this.loading = false))
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
          } else if (this.services.length === 0) {
            this.serviceViewMode = 'list';
            this.error = 'No service is assigned to you.';
            this.selectedServiceId = null;
          }
          this.loadTeams();
          this.loadProjects();
        },
        error: () => {
          this.error = 'Unable to load services. Check that the backend is running.';
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
    this.loadUsersForSelectedService();
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
    this.serviceTasks = [];
  }

  openServicesList(): void {
    this.backToServiceList();
  }

  setTab(tab: 'dashboard' | 'projects' | 'userStories' | 'teamMembers' | 'calendar' | 'settings'): void {
    this.activeTab = tab;
    if (tab === 'dashboard') {
      this.loadUsersForSelectedService();
      this.loadTeams();
      this.loadProjects();
    }
    if (tab === 'userStories') {
      this.loadServiceUserStories();
    }
    if (tab === 'settings') {
      this.loadUserSettings();
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

  openCreateServiceModal(): void {
    this.serviceModalMode = 'create';
    this.editingServiceId = null;
    this.newService = { name: '', responsibleId: this.currentResponsibleId ?? undefined };
    this.showCreateModal = true;
    this.error = '';
  }

  openEditServiceModal(service: Service): void {
    const fallbackResponsibleId = Number(service.responsibleId ?? 0);
    this.serviceModalMode = 'edit';
    this.editingServiceId = Number(service.id);
    this.newService = {
      name: String(service.name ?? '').trim(),
      responsibleId: this.currentResponsibleId ?? (fallbackResponsibleId > 0 ? fallbackResponsibleId : undefined)
    };
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

  deleteService(service: Service): void {
    if (!service?.id) {
      return;
    }

    if (!confirm(`Delete service "${service.name}"?`)) {
      return;
    }

    this.error = '';
    this.success = '';

    this.serviceApi.deleteService(Number(service.id)).subscribe({
      next: () => {
        if (Number(this.selectedServiceId) === Number(service.id)) {
          this.backToServiceList();
        }
        this.success = 'Service deleted successfully.';
        this.loadServices();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Unable to delete service';
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
      this.error = 'Add a project to this service to manage user stories.';
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
            this.error = 'No sprint found. Create a sprint to manage user stories.';
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
          this.error = 'Unable to load project sprints.';
        }
      });
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
        return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
      }
    }

    return new Date(value).toLocaleDateString('fr-FR');
  }

  getServiceStatus(_service: Service): 'Actif' {
    return 'Actif';
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

  getResponsibleLabel(service: Service): string {
    if (!service?.responsibleId) return 'Unassigned';
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
        this.error = 'Unable to update user story status.';
      }
    });
  }

  private getRoleLabel(role: unknown, isManager: boolean): string {
    if (typeof role === 'number') {
      if (role === 0) return 'Administrateur';
      if (role === 1) return 'Service Manager';
      if (role === 2) return 'Project Manager';
      if (role === 3) return 'Employee';
    }
    if (typeof role === 'string' && role.trim().length > 0) return role;
    return isManager ? 'Manager' : 'Employee';
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

    const today = new Date();
    this.calendarDays = [];

    for (let index = 0; index < totalCells; index++) {
      const dayNumber = index - startOffset + 1;
      const inCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
      const isToday = inCurrentMonth
        && dayNumber === today.getDate()
        && month === today.getMonth()
        && year === today.getFullYear();
      const cellDate = inCurrentMonth ? new Date(year, month, dayNumber) : new Date(year, month, 1);
      const iso = this.toIsoDateLocal(cellDate);

      this.calendarDays.push({
        day: inCurrentMonth ? dayNumber : 0,
        iso,
        isToday,
        inCurrentMonth,
        hasProject: false,
        hasTask: false,
        taskCount: 0,
      });
    }

    const projectDates = this.selectedServiceProjects
      .map((project) => this.getSafeIsoDate(project.endDate as Date | string | null | undefined))
      .filter((iso) => !!iso)
      .map((iso) => this.parseToLocalDate(iso));

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
      if (!cell.inCurrentMonth || cell.day <= 0) return cell;
      const cellDate = new Date(year, month, cell.day);
      const iso = this.toIsoDateLocal(cellDate);
      const hasProject = projectDates.some((date) =>
        date.getFullYear() === cellDate.getFullYear()
        && date.getMonth() === cellDate.getMonth()
        && date.getDate() === cellDate.getDate()
      );
      const taskCount = taskCountByIso[iso] ?? 0;
      return { ...cell, hasProject, hasTask: taskCount > 0, taskCount };
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
        const projectIds = this.selectedServiceProjects
          .map((project) => Number(project.id ?? 0))
          .filter((id) => id > 0);

        if (projectIds.length === 0) {
          this.availableSprints = [];
          this.serviceTasks = [];
          this.serviceUserStories = [];
          this.selectedUserStoryStatuses = {};
          this.generateCalendar();
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
              this.selectedUserStoryStatuses[story.numericId] = story.status;
            });

            this.serviceTasks = (tasks ?? []).filter((task) => {
              const sprintId = Number(task.sprintId ?? 0);
              const userStoryId = Number(task.userStoryId ?? 0);
              return sprintIds.has(sprintId) || userStoryIds.has(userStoryId);
            });

            this.generateCalendar();
            this.cdr.detectChanges();
          },
          error: () => {
            this.availableSprints = [];
            this.serviceTasks = [];
            this.serviceUserStories = [];
            this.selectedUserStoryStatuses = {};
            this.generateCalendar();
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.allProjects = [];
        this.availableSprints = [];
        this.serviceTasks = [];
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
      this.serviceTasks = [];
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
