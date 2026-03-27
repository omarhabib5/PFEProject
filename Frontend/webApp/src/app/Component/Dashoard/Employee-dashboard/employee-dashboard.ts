import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, catchError, finalize, forkJoin, interval, of, timeout } from 'rxjs';
import { AuthService } from '../../Auth/Service/auth.service';
import { TokenService } from '../../Auth/Service/token.service';
import { ProjectService, State as ProjectState, project as ProjectEntity } from '../../Page/Projet/Service/ProjectService';
import { Sprint as SprintEntity, SprintService } from '../../Page/Sprint/Service/SprintService';
import { TaskDto, TaskService } from '../../Page/Task/Service/TaskService';
import { UserStoryService } from '../../Page/UserStory/Service/UserStoryService';
import { UserStoryDto, UserStoryStatus } from '../../Page/UserStory/Models/userstory.model';
import { UserApiService } from '../../Page/Team/Service/UserApiService';
import { Service, ServiceService } from '../../Page/Team/Service/ServiceService';

type SidebarSection = 'dashboard' | 'calendar' | 'notifications' | 'settings';
type EmployeeTab = 'overview' | 'tasks' | 'projects' | 'sprints';
type TaskBucket = 'todo' | 'inProgress' | 'review' | 'done';

interface UiTask {
  id: number;
  title: string;
  projectName: string;
  tags: string[];
  bucket: TaskBucket;
  bucketLabel: string;
  priorityLabel: string;
  priorityClass: string;
  estimatedHours: number;
  delayLabel: string;
  rawStatus: TaskDto['status'];
  storyId: number;
  sprintId?: number | null;
}

interface UiProjectCard {
  id: number;
  name: string;
  description: string;
  managerName: string;
  dueDate: string;
  statusLabel: string;
  statusClass: string;
  progress: number;
  myTasks: UiTask[];
  counts: Record<TaskBucket, number>;
  activeSprint: UiSprintCard | null;
  teamChips: string[];
}

interface UiSprintCard {
  id: number;
  name: string;
  projectId: number;
  projectName: string;
  periodLabel: string;
  statusLabel: string;
  storyCount: number;
  velocity: number;
}

interface UiNotification {
  level: 'warning' | 'info' | 'success';
  message: string;
  dateLabel: string;
}

interface CalendarCell {
  day: number;
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  hasDeadline: boolean;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css',
})
export class EmployeeDashboard implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private taskService = inject(TaskService);
  private projectService = inject(ProjectService);
  private sprintService = inject(SprintService);
  private userStoryService = inject(UserStoryService);
  private userApiService = inject(UserApiService);
  private serviceService = inject(ServiceService);
  private autoRefreshSubscription: Subscription | null = null;
  private readonly autoRefreshMs = 15000;

  sidebarSection: SidebarSection = 'dashboard';
  activeTab: EmployeeTab = 'overview';

  loading = false;
  error = '';
  searchTerm = '';

  userName = 'Employee';
  roleLabel = 'Member';
  serviceLabel = 'Service';
  todayLabel = '';
  unreadNotifications = 0;
  profileImageUrl = '';

  currentUserId: number | null = null;

  profileSaving = false;
  passwordSaving = false;
  settingsSuccess = '';
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

  allTasks: TaskDto[] = [];
  myTasks: UiTask[] = [];
  projectCards: UiProjectCard[] = [];
  sprintCards: UiSprintCard[] = [];
  userStories: UserStoryDto[] = [];
  notifications: UiNotification[] = [];

  statusFilter: 'all' | TaskBucket = 'all';
  priorityFilter: 'all' | 'basse' | 'moyenne' | 'haute' | 'urgente' = 'all';

  currentMonth = new Date();
  calendarCells: CalendarCell[] = [];
  selectedCalendarDate: Date | null = null;

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly bucketOrder: TaskBucket[] = ['todo', 'inProgress', 'review', 'done'];
  readonly bucketLabels: Record<TaskBucket, string> = {
    todo: 'To Do',
    inProgress: 'In Progress',
    review: 'In Review',
    done: 'Done'
  };

  ngOnInit(): void {
    if (!this.tokenService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.hydrateProfile();
    this.todayLabel = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    this.loadSettingsProfile();
    this.loadEmployeeData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  get pageTitle(): string {
    if (this.sidebarSection === 'calendar') return 'Calendar';
    if (this.sidebarSection === 'notifications') return 'Notifications';
    if (this.sidebarSection === 'settings') return 'Settings';
    return 'My Dashboard';
  }

  get completionPercent(): number {
    if (this.myTasks.length === 0) return 0;
    return Math.round((this.countByBucket('done') / this.myTasks.length) * 100);
  }

  get inProgressCount(): number {
    return this.countByBucket('inProgress');
  }

  get reviewCount(): number {
    return this.countByBucket('review');
  }

  get doneCount(): number {
    return this.countByBucket('done');
  }

  get totalEstimatedHours(): number {
    return this.myTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
  }

  get highPriorityCount(): number {
    return this.myTasks.filter((task) => task.priorityClass === 'urgente' || task.priorityClass === 'haute').length;
  }

  get inProgressTasks(): UiTask[] {
    return this.myTasks.filter((task) => task.bucket === 'inProgress').slice(0, 5);
  }

  get nearestDueTask(): UiTask | null {
    const candidates = this.myTasks.filter((task) => task.delayLabel.includes('Dans'));
    return candidates.length > 0 ? candidates[0] : null;
  }

  get filteredTasks(): UiTask[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.myTasks.filter((task) => {
      const statusOk = this.statusFilter === 'all' || task.bucket === this.statusFilter;
      const priorityOk = this.priorityFilter === 'all' || task.priorityClass === this.priorityFilter;
      const termOk = !term || task.title.toLowerCase().includes(term) || task.projectName.toLowerCase().includes(term);
      return statusOk && priorityOk && termOk;
    });
  }

  get calendarTitle(): string {
    return this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get selectedDayTasks(): UiTask[] {
    if (!this.selectedCalendarDate) return [];
    return this.myTasks.filter(task => {
      const dueDate = this.taskDueDate(task.id);
      return dueDate && this.sameDate(dueDate, this.selectedCalendarDate);
    });
  }

  get groupedFilteredTasks(): Array<{ bucket: TaskBucket; label: string; items: UiTask[] }> {
    return this.bucketOrder.map((bucket) => ({
      bucket,
      label: this.bucketLabels[bucket],
      items: this.filteredTasks.filter((task) => task.bucket === bucket)
    }));
  }

  get activityWeekly(): number[] {
    const output = [0, 0, 0, 0, 0, 0, 0];
    this.allTasks.forEach((task) => {
      if (!task.createdAt) return;
      const date = new Date(task.createdAt);
      if (Number.isNaN(date.getTime())) return;
      const day = (date.getDay() + 6) % 7;
      output[day] += 1;
    });
    return output;
  }

  setSidebarSection(section: SidebarSection): void {
    this.sidebarSection = section;
    if (section === 'settings') {
      this.settingsSuccess = '';
      this.loadSettingsProfile();
    }
  }

  setTab(tab: EmployeeTab): void {
    this.activeTab = tab;
  }

  setStatusFilter(filter: 'all' | TaskBucket): void {
    this.statusFilter = filter;
  }

  setPriorityFilter(filter: 'all' | 'basse' | 'moyenne' | 'haute' | 'urgente'): void {
    this.priorityFilter = filter;
  }

  get selectedCalendarDateLabel(): string {
    if (!this.selectedCalendarDate) return '';
    return this.selectedCalendarDate.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  goToCurrentCalendarMonth(): void {
    this.currentMonth = new Date();
    this.buildCalendar();
  }

  getTaskStatusLabel(task: UiTask): string {
    return this.bucketLabels[task.bucket] || 'Unknown';
  }

  getTaskAssigneeName(task: UiTask): string {
    const rawTask = this.allTasks.find(t => t.id === task.id);
    return rawTask?.assignedToName || 'Unassigned';
  }

  getUserStoryName(storyId: number): string {
    const story = this.userStories.find(s => Number(s.id) === storyId);
    return story?.name || `Story #${storyId}`;
  }

  getCalendarTaskStateClass(task: UiTask): string {
    if (task.bucket === 'done') return 'done';
    if (task.bucket === 'inProgress') return 'inprogress';
    if (task.bucket === 'review') return 'review';
    return 'todo';
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'Not defined';
    const parsed = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(parsed.getTime())) return 'Not defined';
    return parsed.toLocaleDateString('en-US');
  }

  saveProfileSettings(): void {
    const firstName = this.profileForm.firstName.trim();
    const lastName = this.profileForm.lastName.trim();
    const email = this.profileForm.email.trim();
    const avatarUrl = this.profileForm.avatarUrl.trim();

    if (!firstName || !lastName || !email) {
      this.error = 'First name, last name, and email are required.'
      return;
    }

    const userData = this.tokenService.getUserData();
    const userId = Number(userData?.userId ?? userData?.id ?? 0);
    const roleNumber = this.resolveRoleNumber(userData?.role);

    if (!userId || roleNumber === null) {
      this.error = 'Unable to identify your user account.'
      return;
    }

    this.profileSaving = true;
    this.error = '';
    this.settingsSuccess = '';

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
          this.hydrateProfile();
          this.settingsSuccess = 'Profile updated successfully.'
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
        this.error = 'Unable to update profile.'
      }
    });
  }

  savePasswordSettings(): void {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmNewPassword) {
      this.error = 'Please fill in all password fields.'
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.error = 'The new password must be at least 6 characters long.'
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmNewPassword) {
      this.error = 'Password confirmation does not match.'
      return;
    }

    this.passwordSaving = true;
    this.error = '';
    this.settingsSuccess = '';

    this.authService.changePassword({
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword,
      confirmNewPassword: this.passwordForm.confirmNewPassword
    }).pipe(finalize(() => (this.passwordSaving = false))).subscribe({
      next: () => {
        this.settingsSuccess = 'Password updated successfully.'
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

  logout(): void {
    this.tokenService.clear();
    this.router.navigate(['/login']);
  }

  advanceTask(task: UiTask): void {
    const next = this.nextStatus(task.rawStatus);
    if (next === null) {
      return;
    }

    this.taskService.updateStatus(task.id, next)
      .pipe(timeout(10000))
      .subscribe({
        next: () => {
          this.loadEmployeeData();
        },
        error: () => {
          this.error = 'Unable to update task status.'
        }
      });
  }

  prevMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.buildCalendar();
  }

  private hydrateProfile(): void {
    const data = this.tokenService.getUserData();
    if (data?.firstName || data?.lastName) {
      this.userName = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
    }
    if (data?.role) {
      this.roleLabel = data.role;
    }

    this.profileImageUrl = String((data as any)?.profileImageUrl ?? '').trim();

    const idRaw = data?.userId ?? data?.id;
    const parsed = Number(idRaw);
    this.currentUserId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private loadEmployeeData(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      tasks: this.taskService.getAll().pipe(catchError(() => of([] as TaskDto[]))),
      projects: this.projectService.getAllProjects().pipe(catchError(() => of([] as ProjectEntity[]))),
      services: this.serviceService.getServices().pipe(catchError(() => of([] as Service[])))
    })
      .pipe(timeout(15000))
      .subscribe({
        next: ({ tasks, projects, services }) => {
          const projectIds = projects
            .map((p) => p.id)
            .filter((id): id is number => typeof id === 'number' && id > 0);

          const sprintRequests = projectIds.map((projectId) =>
            this.sprintService.getSprintsByProjectId(projectId).pipe(catchError(() => of([] as SprintEntity[])))
          );

          if (sprintRequests.length === 0) {
            this.composeDashboard(tasks, projects, [], [], services);
            this.loading = false;
            return;
          }

          forkJoin(sprintRequests)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
              next: (sprintsByProject) => {
                const sprints = sprintsByProject.flat();
                const sprintIds = sprints
                  .map((s) => s.id)
                  .filter((id): id is number => typeof id === 'number' && id > 0);

                if (sprintIds.length === 0) {
                  this.composeDashboard(tasks, projects, sprints, [], services);
                  return;
                }

                const storyRequests = sprintIds.map((sprintId) =>
                  this.userStoryService.getBySprintId(sprintId).pipe(catchError(() => of([] as UserStoryDto[])))
                );

                forkJoin(storyRequests).subscribe({
                  next: (storiesBySprint) => {
                    this.composeDashboard(tasks, projects, sprints, storiesBySprint.flat(), services);
                  },
                  error: () => {
                    this.composeDashboard(tasks, projects, sprints, [], services);
                  }
                });
              },
              error: () => {
                this.composeDashboard(tasks, projects, [], [], services);
              }
            });
        },
        error: () => {
          this.loading = false;
          this.error = 'Unable to load employee data.'
        }
      });
  }

  private composeDashboard(
    tasks: TaskDto[],
    projects: ProjectEntity[],
    sprints: SprintEntity[],
    stories: UserStoryDto[],
    services: Service[]
  ): void {
    this.allTasks = tasks;
    this.userStories = stories;

    const sprintById = new Map<number, SprintEntity>();
    sprints.forEach((sprint) => {
      if (typeof sprint.id === 'number') {
        sprintById.set(sprint.id, sprint);
      }
    });

    const storyById = new Map<number, UserStoryDto>();
    stories.forEach((story) => {
      const storyId = Number(story.id);
      if (Number.isFinite(storyId) && storyId > 0) {
        storyById.set(storyId, story);
      }
    });

    const projectById = new Map<number, ProjectEntity>();
    projects.forEach((project) => {
      if (typeof project.id === 'number') {
        projectById.set(project.id, project);
      }
    });

    const serviceById = new Map<number, Service>();
    services.forEach((service) => {
      if (typeof service.id === 'number') {
        serviceById.set(service.id, service);
      }
    });

    const mine = tasks.filter((task) => this.isMine(task));
    this.myTasks = mine.map((task) => this.toUiTask(task, storyById, sprintById, projectById));

    const projectGroups = new Map<number, UiTask[]>();
    this.myTasks.forEach((task) => {
      const projectId = this.resolveProjectId(task, storyById, sprintById);
      if (!projectId) return;
      const list = projectGroups.get(projectId) ?? [];
      list.push(task);
      projectGroups.set(projectId, list);
    });

    this.projectCards = Array.from(projectGroups.entries()).map(([projectId, myProjectTasks]) => {
      const project = projectById.get(projectId);
      const allProjectTasks = tasks.filter((task) => {
        const story = storyById.get(task.userStoryId);
        const sprint = story?.sprintId ? sprintById.get(Number(story.sprintId)) : null;
        const pid = Number((sprint as any)?.projectId ?? 0);
        return pid === projectId;
      });

      const counts: Record<TaskBucket, number> = {
        todo: myProjectTasks.filter((t) => t.bucket === 'todo').length,
        inProgress: myProjectTasks.filter((t) => t.bucket === 'inProgress').length,
        review: myProjectTasks.filter((t) => t.bucket === 'review').length,
        done: myProjectTasks.filter((t) => t.bucket === 'done').length
      };

      const doneAll = allProjectTasks.filter((t) => this.mapBucket(t.status) === 'done').length;
      const progress = allProjectTasks.length > 0 ? Math.round((doneAll / allProjectTasks.length) * 100) : 0;

      const projectSprints = sprints.filter((sprint) => Number((sprint as any).projectId) === projectId);
      const activeSprint = this.toActiveSprint(projectSprints, stories, project?.name ?? 'Projet');

      const manager = (project?.projectManager as any) ? `${(project?.projectManager as any).firstName ?? ''} ${(project?.projectManager as any).lastName ?? ''}`.trim() : 'Unassigned';
      const dueDate = this.toFrDate((project as any)?.endDate);

      return {
        id: projectId,
        name: project?.name ?? `Projet ${projectId}`,
        description: project?.description ?? 'Aucune description',
        managerName: manager || 'Unassigned',
        dueDate,
        statusLabel: this.getProjectStateLabel(project?.projectState),
        statusClass: this.getProjectStateClass(project?.projectState),
        progress,
        myTasks: myProjectTasks,
        counts,
        activeSprint,
        teamChips: this.extractTeamChips(project, manager)
      } as UiProjectCard;
    });

    this.sprintCards = sprints
      .filter((sprint) => this.projectCards.some((card) => card.id === Number((sprint as any).projectId)))
      .map((sprint) => {
        const sprintStories = stories.filter((story) => Number(story.sprintId) === sprint.id);
        const completedStories = sprintStories.filter((story) => this.isStoryDone(story.status)).length;
        return {
          id: sprint.id,
          projectId: Number((sprint as any).projectId ?? 0),
          projectName: projectById.get(Number((sprint as any).projectId ?? 0))?.name ?? 'Projet',
          name: sprint.name,
          periodLabel: `${this.toFrDate((sprint as any).startDate)} → ${this.toFrDate((sprint as any).endDate)}`,
          statusLabel: this.getSprintStateLabel((sprint as any).sprintState),
          storyCount: sprintStories.length,
          velocity: completedStories * 3
        };
      });

    const myServiceNames = Array.from(new Set(
      this.projectCards
        .map((card) => projectById.get(card.id))
        .map((project) => {
          const serviceId = Number(project?.serviceId ?? 0);
          return serviceId > 0 ? (serviceById.get(serviceId)?.name ?? '') : '';
        })
        .filter((name) => name.trim().length > 0)
    ));
    this.serviceLabel = myServiceNames.length > 0 ? myServiceNames.join(', ') : 'Undefined service';

    this.notifications = this.buildNotifications();
    this.unreadNotifications = this.notifications.length;
    this.buildCalendar();
  }

  private toUiTask(
    task: TaskDto,
    storyById: Map<number, UserStoryDto>,
    sprintById: Map<number, SprintEntity>,
    projectById: Map<number, ProjectEntity>
  ): UiTask {
    const story = storyById.get(task.userStoryId);
    const sprint = (task.sprintId ? sprintById.get(task.sprintId) : null) ?? (story?.sprintId ? sprintById.get(Number(story.sprintId)) : null);
    const project = sprint ? projectById.get(Number((sprint as any).projectId ?? 0)) : null;
    const bucket = this.mapBucket(task.status);
    const priority = this.mapPriority(task.complexity);

    return {
      id: task.id,
      title: task.title,
      projectName: project?.name ?? 'Unassigned project',
      tags: [
        task.description?.split(' ').slice(0, 2).join(' ') || 'task'
      ],
      bucket,
      bucketLabel: this.bucketLabels[bucket],
      priorityLabel: priority.label,
      priorityClass: priority.class,
      estimatedHours: Number(task.estimatedHours ?? 0),
      delayLabel: this.buildDelayLabel(task.endDate),
      rawStatus: task.status,
      storyId: task.userStoryId,
      sprintId: task.sprintId
    };
  }

  private resolveProjectId(task: UiTask, storyById: Map<number, UserStoryDto>, sprintById: Map<number, SprintEntity>): number | null {
    const story = storyById.get(task.storyId);
    const sprint = (task.sprintId ? sprintById.get(task.sprintId) : null) ?? (story?.sprintId ? sprintById.get(Number(story.sprintId)) : null);
    const projectId = Number((sprint as any)?.projectId ?? 0);
    return projectId > 0 ? projectId : null;
  }

  private toActiveSprint(sprints: SprintEntity[], stories: UserStoryDto[], projectName: string): UiSprintCard | null {
    if (sprints.length === 0) return null;

    const now = new Date();
    const active = sprints.find((sprint) => {
      const start = new Date((sprint as any).startDate);
      const end = new Date((sprint as any).endDate);
      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && now >= start && now <= end;
    }) ?? sprints[0];

    const sprintStories = stories.filter((story) => Number(story.sprintId) === active.id);
    return {
      id: active.id,
      projectId: Number((active as any).projectId ?? 0),
      projectName,
      name: active.name,
      periodLabel: `${this.toFrDate((active as any).startDate)} → ${this.toFrDate((active as any).endDate)}`,
      statusLabel: this.getSprintStateLabel((active as any).sprintState),
      storyCount: sprintStories.length,
      velocity: sprintStories.filter((story) => this.isStoryDone(story.status)).length * 3
    };
  }

  private buildNotifications(): UiNotification[] {
    const notifications: UiNotification[] = [];

    this.myTasks.forEach((task) => {
      if (task.priorityClass === 'urgente' || task.priorityClass === 'haute') {
        notifications.push({
          level: 'warning',
          message: `${task.priorityLabel} priority: ${task.title}`,
          dateLabel: this.todayLabel
        });
      }
      if (task.delayLabel.startsWith('Late')) {
        notifications.push({
          level: 'info',
          message: `${task.title} is ${task.delayLabel.toLowerCase()}`,
          dateLabel: this.todayLabel
        });
      }
    });

    if (this.doneCount > 0) {
      notifications.push({
        level: 'success',
        message: `${this.doneCount} task(s) completed` ,
        dateLabel: this.todayLabel
      });
    }

    return notifications.slice(0, 8);
  }

  private buildCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);
    const today = new Date();

    this.calendarCells = Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        day: date.getDate(),
        date,
        inCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        hasDeadline: this.myTasks.some((task) => {
          if (!task.delayLabel) return false;
          return this.sameDate(date, this.taskDueDate(task.id));
        })
      };
    });
  }

  taskDueDate(taskId: number): Date | null {
    const raw = this.allTasks.find((task) => task.id === taskId)?.endDate;
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  sameDate(a: Date, b: Date | null): boolean {
    if (!b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private isMine(task: TaskDto): boolean {
    if (this.currentUserId && typeof task.assignedToId === 'number') {
      return task.assignedToId === this.currentUserId;
    }

    const fullName = this.userName.trim().toLowerCase();
    if (!fullName) {
      return false;
    }
    return (task.assignedToName ?? '').toLowerCase().includes(fullName);
  }

  private mapBucket(status: TaskDto['status']): TaskBucket {
    const normalized = typeof status === 'string' ? status.toLowerCase() : Number(status);

    if (normalized === 'inprogress' || normalized === 'in progress' || normalized === 2) return 'inProgress';
    if (normalized === 'review') return 'review';
    if (normalized === 'done' || normalized === 'validated' || normalized === 3 || normalized === 4) return 'done';
    if (normalized === 'pending' || normalized === 0) return 'review';
    return 'todo';
  }

  private mapPriority(complexity: number | undefined): { label: string; class: 'basse' | 'moyenne' | 'haute' | 'urgente' } {
    const value = Number(complexity ?? 1);
    if (value >= 4) return { label: 'Urgent', class: 'urgente' };
    if (value >= 3) return { label: 'High', class: 'haute' };
    if (value >= 2) return { label: 'Medium', class: 'moyenne' };
    return { label: 'Low', class: 'basse' };
  }

  private buildDelayLabel(endDate: string | undefined): string {
    if (!endDate) return 'No deadline';
    const due = new Date(endDate);
    if (Number.isNaN(due.getTime())) return 'No deadline';
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days < 0) return `Late by ${Math.abs(days)}d`;
    return `In ${days}d`;
  }

  private nextStatus(status: TaskDto['status']): UserStoryStatus | null {
    const bucket = this.mapBucket(status);
    if (bucket === 'todo') return UserStoryStatus.IN_PROGRESS;
    if (bucket === 'inProgress') return UserStoryStatus.REVIEW;
    if (bucket === 'review') return UserStoryStatus.DONE;
    return null;
  }

  countByBucket(bucket: TaskBucket): number {
    return this.myTasks.filter((task) => task.bucket === bucket).length;
  }

  private getProjectStateLabel(state: ProjectState | undefined): string {
    if (state === ProjectState.done || state === ProjectState.validated) return 'Done';
    if (state === ProjectState.inProgress) return 'Active';
    if (state === ProjectState.todo) return 'Paused';
    return 'Pending';
  }

  private getProjectStateClass(state: ProjectState | undefined): string {
    if (state === ProjectState.done || state === ProjectState.validated) return 'done';
    if (state === ProjectState.inProgress) return 'active';
    if (state === ProjectState.todo) return 'paused';
    return 'pending';
  }

  private getSprintStateLabel(value: unknown): string {
    const state = Number(value);
    if (state === 2) return 'Active';
    if (state === 3 || state === 4) return 'Done';
    if (state === 1) return 'Planned';
    return 'Pending';
  }

  private isStoryDone(value: unknown): boolean {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === UserStoryStatus.DONE.toLowerCase();
    }

    return Number(value) === 3 || Number(value) === 4;
  }

  private toFrDate(value: unknown): string {
    if (!value) return '—';
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US');
  }

  private extractTeamChips(project: ProjectEntity | undefined, managerName: string): string[] {
    const names: string[] = [];
    if (managerName && managerName !== 'Unassigned') names.push(managerName.split(' ')[0]);
    names.push(this.userName.split(' ')[0] || 'Me');
    if (project?.team?.name) names.push(project.team.name);
    return Array.from(new Set(names)).slice(0, 4);
  }

  private loadSettingsProfile(): void {
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
      this.syncLocalUserProfile(
        this.profileForm.firstName,
        this.profileForm.lastName,
        this.profileForm.email,
        this.profileForm.avatarUrl || undefined
      );
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

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshSubscription = interval(this.autoRefreshMs).subscribe(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      this.loadEmployeeData();
      if (this.sidebarSection === 'settings') {
        this.loadSettingsProfile();
      }
    });
  }

  private stopAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
    this.autoRefreshSubscription = null;
  }

}
