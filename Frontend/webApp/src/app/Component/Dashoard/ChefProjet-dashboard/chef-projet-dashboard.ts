import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TokenService } from '../../Auth/Service/token.service';
import { project, ProjectService } from '../../Page/Projet/Service/ProjectService';
import {
  CreateSprintDto,
  Sprint,
  SprintService,
  State,
  UpdateSprintDto,
} from '../../Page/Sprint/Service/SprintService';
import {
  CreateTaskRequest,
  TaskDto,
  TaskService,
  TaskState,
  UpdateTaskRequest,
} from '../../Page/Task/Service/TaskService';
import { UserStoryDto } from '../../Page/UserStory/Models/userstory.model';
import { UserStoryService } from '../../Page/UserStory/Service/UserStoryService';
import { UserApiService, UserDto } from '../../Page/Team/Service/UserApiService';
import { TeamService, TeamUser } from '../../Page/Team/Service/TeamService';
import { AuthService } from '../../Auth/Service/auth.service';
import { Router } from '@angular/router';
import { ChangePasswordRequest } from '../../Auth/model/auth.model';
import { NotificationService } from '../../Page/Notifiation/Service/NotifcationService';
import { Notification as AppNotification } from '../../Page/Notifiation/Models/Notification.Model';

type DashboardSection = 'projects' | 'calendar' | 'notifications' | 'messagerie' | 'settings';
type ProjectTab = 'userStories' | 'sprints' | 'tasks';

interface SprintFormModel {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  estimatedDuration: number;
  sprintState: State;
  projectId: number;
}

interface TaskFormModel {
  title: string;
  description: string;
  estimatedHours: number;
  status: TaskState;
  complexity: number;
  startDate: string;
  endDate: string;
  userStoryId: number;
  sprintId: number | null;
  assignedToUserId: number | null;
}

interface ChangePasswordFormModel {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

type CalendarEventType = 'task';

interface CalendarEventItem {
  id: string;
  title: string;
  type: CalendarEventType;
  startIso: string;
  endIso: string;
  meta: string;
  className: string;
}

interface CalendarDayCell {
  date: Date;
  iso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEventItem[];
}

interface MessagingContact {
  id: number;
  name: string;
}

@Component({
  selector: 'app-chef-projet-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './chef-projet-dashboard.html',
})
export class ChefProjetDashboard implements OnInit, OnDestroy {
  private projectService = inject(ProjectService);
  private sprintService = inject(SprintService);
  private taskService = inject(TaskService);
  private userStoryService = inject(UserStoryService);
  private userApiService = inject(UserApiService);
  private teamService = inject(TeamService);
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  private notificationCountSubscription: Subscription | null = null;
  private notificationsSubscription: Subscription | null = null;

  private currentManagerId: number | null = null;
  private scopedProjectIds = new Set<number>();
  private scopedSprintIds = new Set<number>();
  private scopedUserStoryIds = new Set<number>();
  private cdr=inject(ChangeDetectorRef);

  activeSection: DashboardSection = 'projects';
  activeProjectTab: ProjectTab = 'tasks';

  loading = false;
  sprintSaving = false;
  taskSaving = false;
  passwordSaving = false;
  isLoggingOut = false;
  error = '';
  success = '';
  notificationCount = 0;
  notifications: AppNotification[] = [];
  taskMessageDraftByTaskId: Record<number, string> = {};
  showTaskMessageComposerForId: number | null = null;
  sendingTaskMessageId: number | null = null;
  messagingContacts: MessagingContact[] = [];
  selectedMessagingUserId: number | null = null;
  conversationMessages: AppNotification[] = [];
  conversationDraft = '';
  conversationAttachmentName = '';
  conversationAttachmentDataUrl = '';
  conversationSending = false;

  projects: project[] = [];
  sprints: Sprint[] = [];
  tasks: TaskDto[] = [];
  userStories: UserStoryDto[] = [];
  employeeUsers: UserDto[] = [];
  private teamMemberNamesByTeamId: Record<number, string[]> = {};
  private teamMembersByTeamId: Record<number, UserDto[]> = {};

  selectedProjectFilter: number | 'all' = 'all';
  selectedSprintFilter: number | 'all' = 'all';
  selectedTaskStatusFilter: TaskState | 'all' = 'all';

  showSprintForm = false;
  sprintEditId: number | null = null;
  sprintForm: SprintFormModel = this.getEmptySprintForm();

  showTaskForm = false;
  taskEditId: number | null = null;
  taskForm: TaskFormModel = this.getEmptyTaskForm();
  passwordForm: ChangePasswordFormModel = this.getEmptyPasswordForm();

  sprintStateOptions = [
    { value: State.pending, label: 'Pending', autoManaged: false },
    { value: State.todo, label: 'To Do', autoManaged: true },
    { value: State.inProgress, label: 'In Progress', autoManaged: true },
    { value: State.done, label: 'Done', autoManaged: true },
    { value: State.validated, label: 'Validated', autoManaged: false },
  ];

  taskStatusOptions: { value: TaskState; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'todo', label: 'To Do' },
    { value: 'inProgress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'validated', label: 'Validated' },
  ];

  readonly calendarWeekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  currentCalendarDate = new Date();
  selectedCalendarDateIso = this.toIsoDateLocal(new Date());

  ngOnInit(): void {
    this.initializeNotifications();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.notificationCountSubscription?.unsubscribe();
    this.notificationCountSubscription = null;
    this.notificationsSubscription?.unsubscribe();
    this.notificationsSubscription = null;
  }

  logout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;
    this.authService.logout().subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
      error: () => {
        
        void this.router.navigate(['/login']);
      },
      complete: () => {
        this.isLoggingOut = false;
      }
    });
  }

  setSection(section: DashboardSection): void {
    this.activeSection = section;
    if (section === 'notifications' || section === 'messagerie') {
      this.refreshNotifications();
      this.refreshMessagingContacts();
    }
    this.clearMessages();
  }

  refreshMessagingContacts(): void {
    const mapById = new Map<number, string>();

    (this.employeeUsers ?? []).forEach((user) => {
      const id = Number(user.id ?? 0);
      if (id <= 0) {
        return;
      }
      mapById.set(id, this.getEmployeeLabel(user));
    });

    this.messagingContacts = Array.from(mapById.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (this.selectedMessagingUserId && !mapById.has(this.selectedMessagingUserId)) {
      this.selectedMessagingUserId = null;
      this.conversationMessages = [];
      this.cdr.detectChanges();
    }
  }

  selectMessagingUser(userId: number): void {
    this.selectedMessagingUserId = userId;
    this.conversationDraft = '';
    this.conversationAttachmentName = '';
    this.conversationAttachmentDataUrl = '';
    this.cdr.detectChanges();
    this.loadConversationMessages();
  }

  loadConversationMessages(): void {
    if (!this.selectedMessagingUserId) {
      this.conversationMessages = [];
      this.cdr.detectChanges();
      return;
    }

    this.notificationService.getConversation(this.selectedMessagingUserId).subscribe({
      next: (items) => {
        this.conversationMessages = (items ?? []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Unable to load conversation.';
        this.cdr.detectChanges();
      }
    });
  }

  onConversationAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    
    if (!file) {
      this.conversationAttachmentName = '';
      this.conversationAttachmentDataUrl = '';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.error = 'File attachment should not exceed 10MB.';
      this.conversationAttachmentName = '';
      this.conversationAttachmentDataUrl = '';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.conversationAttachmentName = file.name;
      this.conversationAttachmentDataUrl = typeof reader.result === 'string' ? reader.result : '';
      this.error = '';
      this.cdr.detectChanges();
    };
    reader.onerror = () => {
      this.error = 'Unable to read attachment file.';
      this.conversationAttachmentName = '';
      this.conversationAttachmentDataUrl = '';
      input.value = '';
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearConversationAttachment(): void {
    this.conversationAttachmentName = '';
    this.conversationAttachmentDataUrl = '';
    const fileInput = document.getElementById('conversationAttachmentInputPM') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.cdr.detectChanges();
  }

  sendConversationMessage(): void {
    if (!this.selectedMessagingUserId) {
      return;
    }

    const text = this.conversationDraft.trim();
    const hasAttachment = this.conversationAttachmentDataUrl.trim().length > 0;
    if (!text && !hasAttachment) {
      this.error = 'Message or attachment is required.';
      return;
    }

    this.conversationSending = true;
    this.clearMessages();
    this.cdr.detectChanges();

    this.notificationService.sendDirectMessage({
      recipientUserId: this.selectedMessagingUserId,
      message: text,
      title: 'Project manager message',
      attachmentName: hasAttachment ? this.conversationAttachmentName : undefined,
      attachmentDataUrl: hasAttachment ? this.conversationAttachmentDataUrl : undefined,
    }).subscribe({
      next: () => {
        this.conversationDraft = '';
        this.clearConversationAttachment();
        this.conversationSending = false;
        this.loadConversationMessages();
        this.refreshNotifications();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err?.status === 413
          ? 'La piece jointe est trop volumineuse pour le serveur. Essayez un fichier plus petit.'
          : (err?.error?.message || 'Unable to send message.');
        this.conversationSending = false;
        this.cdr.detectChanges();
      }
    });
  }

  getSelectedMessagingUserName(): string {
    if (!this.selectedMessagingUserId) {
      return 'Select an employee';
    }
    const item = this.messagingContacts.find((contact) => contact.id === this.selectedMessagingUserId);
    return item?.name ?? `User #${this.selectedMessagingUserId}`;
  }

  isMessageSentByCurrentUser(item: AppNotification): boolean {
    const currentManagerId = this.resolveCurrentManagerId();
    return Number(item.relatedUserId ?? 0) === Number(currentManagerId ?? 0);
  }

  hasAttachment(item: AppNotification): boolean {
    const fromNewValue = typeof item.newValue === 'string' && item.newValue.trim().startsWith('data:');
    const fromLegacyLink = typeof item.link === 'string' && item.link.trim().startsWith('data:');
    return fromNewValue || fromLegacyLink;
  }

  getAttachmentHref(item: AppNotification): string {
    if (typeof item.newValue === 'string' && item.newValue.trim().startsWith('data:')) {
      return item.newValue;
    }

    if (typeof item.link === 'string' && item.link.trim().startsWith('data:')) {
      return item.link;
    }

    return '';
  }

  markNotificationAsRead(notificationId: number): void {
    this.clearMessages();
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
    const userId = this.resolveCurrentManagerId();
    if (!userId) {
      return;
    }

    this.clearMessages();
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

  submitPasswordChange(): void {
    if (this.passwordSaving) {
      return;
    }

    const payload: ChangePasswordRequest = {
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword,
      confirmNewPassword: this.passwordForm.confirmNewPassword,
    };

    if (!payload.currentPassword.trim() || !payload.newPassword.trim() || !payload.confirmNewPassword.trim()) {
      this.error = 'All password fields are required.';
      this.success = '';
      this.cdr.detectChanges();
      return;
    }

    if (payload.newPassword.length < 6) {
      this.error = 'New password must be at least 6 characters.';
      this.success = '';
      this.cdr.detectChanges();
      return;
    }

    if (payload.newPassword !== payload.confirmNewPassword) {
      this.error = 'New password and confirmation do not match.';
      this.success = '';
      this.cdr.detectChanges();
      return;
    }

    this.passwordSaving = true;
    this.clearMessages();

    this.authService.changePassword(payload).subscribe({
      next: () => {
        this.success = 'Password changed successfully.';
        this.passwordForm = this.getEmptyPasswordForm();
        this.passwordSaving = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unable to change password.';
        this.error = message;
        this.passwordSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  setProjectTab(tab: ProjectTab): void {
    this.activeProjectTab = tab;
    this.clearMessages();
  }

  selectProject(projectId: number): void {
    if (!this.scopedProjectIds.has(projectId)) {
      return;
    }

    this.selectedProjectFilter = projectId;
    this.selectedSprintFilter = 'all';
    this.showSprintForm = false;
    this.showTaskForm = false;
    this.sprintEditId = null;
    this.taskEditId = null;
    this.sprintForm = this.getEmptySprintForm();
    this.taskForm = this.getEmptyTaskForm();
    this.clearMessages();
  }

  clearProjectSelection(): void {
    this.selectedProjectFilter = 'all';
    this.selectedSprintFilter = 'all';
    this.showSprintForm = false;
    this.showTaskForm = false;
    this.sprintEditId = null;
    this.taskEditId = null;
    this.sprintForm = this.getEmptySprintForm();
    this.taskForm = this.getEmptyTaskForm();
    this.clearMessages();
  }

  get hasSelectedProject(): boolean {
    if (this.selectedProjectFilter === 'all') {
      return false;
    }

    return this.scopedProjectIds.has(Number(this.selectedProjectFilter));
  }


  get currentProject(): project | null {
    if (this.projects.length === 0 || !this.hasSelectedProject) {
      return null;
    }

    const selectedId = Number(this.selectedProjectFilter);
    if (!Number.isNaN(selectedId) && this.scopedProjectIds.has(selectedId)) {
      const selected = this.projects.find((item) => Number(item.id) === selectedId);
      if (selected) {
        return selected;
      }
    }

    return null;
  }

  get selectedProjectSprints(): Sprint[] {
    const projectId = Number(this.selectedProjectFilter);
    if (!this.hasSelectedProject || Number.isNaN(projectId)) {
      return [];
    }

    return this.sprints.filter((item) => Number(item.projectId) === projectId);
  }

  get selectedProjectUserStories(): UserStoryDto[] {
    const projectId = Number(this.selectedProjectFilter);
    if (!this.hasSelectedProject || Number.isNaN(projectId)) {
      return [];
    }

    const sprintIds = new Set(this.selectedProjectSprints.map((item) => Number(item.id)));
    const userStoryIdsFromProjectTasks = new Set(
      this.tasks
        .filter((task) => {
          const taskProjectId = Number((task as any)?.projectId ?? 0);
          const taskSprintId = Number(task.sprintId ?? 0);
          return taskProjectId === projectId || sprintIds.has(taskSprintId);
        })
        .map((task) => Number((task as any)?.userStoryId ?? 0))
        .filter((id) => id > 0)
    );

    return this.userStories.filter((story) => {
      const storyProjectId = Number((story as any)?.projectId ?? 0);
      const storySprintId = Number(story?.sprintId ?? 0);
      const storyId = Number((story as any)?.id ?? (story as any)?.Id ?? 0);
      if (storyProjectId > 0) {
        return storyProjectId === projectId;
      }

      if (sprintIds.has(storySprintId)) {
        return true;
      }

      return userStoryIdsFromProjectTasks.has(storyId);
    });
  }

  get selectedProjectTasks(): TaskDto[] {
    if (!this.hasSelectedProject) {
      return [];
    }

    const projectId = Number(this.selectedProjectFilter);
    const sprintIds = new Set(this.selectedProjectSprints.map((item) => Number(item.id)));
    const userStoryIds = new Set(this.selectedProjectUserStories.map((item) => Number((item as any)?.id ?? (item as any)?.Id ?? 0)));

    return this.tasks.filter((task) => {
      const taskProjectId = Number((task as any)?.projectId ?? 0);
      const taskSprintId = Number(task.sprintId ?? 0);
      const taskUserStoryId = Number(task.userStoryId ?? 0);
      return taskProjectId === projectId || sprintIds.has(taskSprintId) || userStoryIds.has(taskUserStoryId);
    });
  }

  get projectStatusLabel(): string {
    if (!this.currentProject) {
      return '—';
    }
    return this.getSprintStateLabel(this.currentProject.projectState as State).toLowerCase();
  }

  get projectStatusClass(): string {
    if (!this.currentProject) {
      return 'state-pending';
    }
    return this.getSprintStateClass(this.currentProject.projectState as State);
  }

  get projectStartDateInput(): string {
    const startDate = this.currentProject?.startDate;
    return startDate ? this.toDateInput(startDate) : '';
  }

  get projectEndDateInput(): string {
    const endDate = this.currentProject?.endDate;
    return endDate ? this.toDateInput(endDate) : '';
  }

  get taskMinDateInput(): string {
    const story = this.getSelectedTaskUserStory();
    const storyStart = story?.startDate ? this.toDateInput(story.startDate) : '';
    return this.maxDateString(this.projectStartDateInput, storyStart);
  }

  get taskMaxDateInput(): string {
    const story = this.getSelectedTaskUserStory();
    const storyEnd = story?.endDate ? this.toDateInput(story.endDate) : '';
    return this.minDateString(this.projectEndDateInput, storyEnd);
  }

  get managerDisplayName(): string {
    const userData = this.tokenService.getUserData();
    const fullName = `${userData?.firstName ?? ''} ${userData?.lastName ?? ''}`.trim();
    return fullName || 'Project Manager';
  }

  get managerRoleLabel(): string {
    const role = String(this.tokenService.getUserData()?.role ?? '').trim();
    return role || 'Project Manager';
  }

  get calendarMonthLabel(): string {
    return this.currentCalendarDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
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

  get calendarDays(): CalendarDayCell[] {
    return this.buildCalendarDays();
  }

  get selectedCalendarDayEvents(): CalendarEventItem[] {
    return this.getEventsForDate(this.selectedCalendarDateIso);
  }

  get currentDateLabel(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  get teamDisplayMembers(): string[] {
    const teamId = this.getCurrentProjectTeamId();
    if (!teamId) {
      return [];
    }
    return (this.teamMemberNamesByTeamId[teamId] ?? []).slice(0, 8);
  }

  get assignableUsers(): UserDto[] {
    const teamId = this.getCurrentProjectTeamId();
    if (!teamId) {
      return [];
    }

    return this.teamMembersByTeamId[teamId] ?? [];
  }

  get completedStoriesCount(): number {
    return this.filteredUserStories.filter((story) => {
      const rawStatus = String(story?.status ?? '').toLowerCase();
      const numericState = Number((story as any)?.userStoryState ?? -1);
      return rawStatus.includes('done') || numericState === 3 || numericState === 4;
    }).length;
  }

  get totalStoryPoints(): number {
    return this.filteredUserStories.reduce((sum, story) => sum + Number(story.storyPoints ?? 0), 0);
  }

  get completedStoryPoints(): number {
    return this.filteredUserStories.reduce((sum, story) => {
      const rawStatus = String(story?.status ?? '').toLowerCase();
      const numericState = Number((story as any)?.userStoryState ?? -1);
      const isDone = rawStatus.includes('done') || numericState === 3 || numericState === 4;
      return sum + (isDone ? Number(story.storyPoints ?? 0) : 0);
    }, 0);
  }

  get userStoriesProgress(): number {
    if (this.totalStoryPoints <= 0) {
      return this.filteredUserStories.length > 0 ? Math.round((this.completedStoriesCount / this.filteredUserStories.length) * 100) : 0;
    }
    return Math.round((this.completedStoryPoints / this.totalStoryPoints) * 100);
  }

  get sprintProgress(): number {
    if (this.filteredSprints.length === 0) {
      return 0;
    }
    return Math.round((this.completedSprintsCount / this.filteredSprints.length) * 100);
  }

  get tasksProgress(): number {
    if (this.selectedProjectTasks.length === 0) {
      return 0;
    }
    return Math.round((this.completedTasksCount / this.selectedProjectTasks.length) * 100);
  }

  get progressLineWidth(): number {
    return Math.max(4, Math.min(this.globalProgress, 100));
  }

  goToPreviousCalendarMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() - 1,
      1
    );
  }

  goToNextCalendarMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() + 1,
      1
    );
  }

  goToCurrentCalendarMonth(): void {
    const today = new Date();
    this.currentCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.selectedCalendarDateIso = this.toIsoDateLocal(today);
  }

  selectCalendarDay(iso: string): void {
    this.selectedCalendarDateIso = iso;
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = '';

    this.currentManagerId = this.resolveCurrentManagerId();
    if (this.currentManagerId === null) {
      this.projects = [];
      this.sprints = [];
      this.tasks = [];
      this.userStories = [];
      this.loading = false;
      this.error = 'Project manager user not identified.';
      return;
    }

    forkJoin({
      projects: this.projectService.getAllProjects().pipe(catchError(() => of([] as project[]))),
      sprints: this.sprintService.getAllSprints().pipe(catchError(() => of([] as Sprint[]))),
      tasks: this.taskService.getAll().pipe(catchError(() => of([] as TaskDto[]))),
      users: this.userApiService.getUsers().pipe(catchError(() => of([] as UserDto[]))),
    }).subscribe({
      next: ({ projects, sprints, tasks, users }) => {
        const ownedProjectIds = (projects ?? [])
          .filter((item) => Number((item as any)?.projectManagerId ?? (item as any)?.ProjectManagerId ?? 0) === Number(this.currentManagerId))
          .map((item) => Number((item as any)?.id ?? (item as any)?.Id ?? 0))
          .filter((id) => id > 0);

        this.loadUserStoriesForProjects(ownedProjectIds).subscribe({
          next: (userStories) => {
            this.applyScopedData(projects, sprints, tasks, userStories);
            this.employeeUsers = (users ?? []).filter((user) => this.isEmployeeRole(user.role));
            this.refreshMessagingContacts();
            this.preloadDeclaredTeamMembers();

            if (this.projects.length === 0) {
              this.error = 'No project is assigned to you.';
            }

            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.error = 'Unable to load user stories.';
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.error = 'Unable to load dashboard data.';
        this.loading = false;
          this.cdr.detectChanges();
      },
    });
  }

  get filteredSprints(): Sprint[] {
    if (!this.hasSelectedProject) {
      return [];
    }

    return this.selectedProjectSprints;
  }

  get filteredUserStories(): UserStoryDto[] {
    return this.selectedProjectUserStories;
  }

  get filteredTasks(): TaskDto[] {
    return this.selectedProjectTasks.filter((task) => {
      const sprintMatches =
        this.selectedSprintFilter === 'all' || Number(task.sprintId ?? 0) === Number(this.selectedSprintFilter);
      const statusMatches =
        this.selectedTaskStatusFilter === 'all' || this.normalizeTaskState(task.status) === this.selectedTaskStatusFilter;
      return sprintMatches && statusMatches;
    });
  }

  get completedTasksCount(): number {
    return this.selectedProjectTasks.filter((task) => {
      const status = this.normalizeTaskState(task.status);
      return status === 'done' || status === 'validated';
    }).length;
  }



  get completedSprintsCount(): number {
    return this.filteredSprints.filter((s) => s.sprintState === State.done || s.sprintState === State.validated).length;
  }

  get globalProgress(): number {
    if (this.selectedProjectTasks.length === 0) {
      return 0;
    }
    return Math.round((this.completedTasksCount / this.selectedProjectTasks.length) * 100);
  }

  openCreateSprint(): void {
    if (!this.currentProject) {
      this.error = 'Select a project first.';
      return;
    }

    this.sprintEditId = null;
    this.showSprintForm = true;
    this.sprintForm = this.getEmptySprintForm();
    this.sprintForm.projectId = Number(this.currentProject.id ?? 0);
    this.recomputeSprintDuration();
  }

  openEditSprint(sprint: Sprint): void {
    this.sprintEditId = sprint.id;
    this.showSprintForm = true;
    this.sprintForm = {
      name: sprint.name,
      description: sprint.description,
      startDate: this.toDateInput(sprint.startDate),
      endDate: this.toDateInput(sprint.endDate),
      estimatedDuration: sprint.estimatedDuration,
      sprintState: sprint.sprintState,
      projectId: sprint.projectId,
    };
    this.recomputeSprintDuration();
  }

  cancelSprintForm(): void {
    this.showSprintForm = false;
    this.sprintEditId = null;
    this.sprintForm = this.getEmptySprintForm();
  }

  submitSprint(): void {
    if (!this.sprintForm.name.trim() || this.sprintForm.projectId <= 0) {
      this.error = 'Sprint name and project are required.';
      return;
    }

    if (!this.scopedProjectIds.has(Number(this.sprintForm.projectId))) {
      this.error = 'You can only manage your own projects.';
      return;
    }

    if (new Date(this.sprintForm.endDate) <= new Date(this.sprintForm.startDate)) {
      this.error = 'End date must be after start date.';
      return;
    }

    if (!this.isDateInRange(this.sprintForm.startDate, this.projectStartDateInput, this.projectEndDateInput)
      || !this.isDateInRange(this.sprintForm.endDate, this.projectStartDateInput, this.projectEndDateInput)) {
      this.error = 'Sprint dates must be within project range.';
      return;
    }

    this.recomputeSprintDuration();
    this.sprintSaving = true;
    this.clearMessages();

    const payload: CreateSprintDto = {
      name: this.sprintForm.name.trim(),
      description: this.sprintForm.description.trim(),
      startDate: new Date(this.sprintForm.startDate),
      endDate: new Date(this.sprintForm.endDate),
      estimatedDuration: Number(this.sprintForm.estimatedDuration),
      sprintState: Number(this.sprintForm.sprintState),
      projectId: Number(this.sprintForm.projectId),
    };

    if (this.sprintEditId) {
      const updatePayload: UpdateSprintDto = { id: this.sprintEditId, ...payload };
      this.sprintService.updateSprint(this.sprintEditId, updatePayload).subscribe({
        next: () => {
          this.success = 'Sprint updated successfully.';
          this.sprintSaving = false;
          this.cancelSprintForm();
          this.loadDashboardData();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Error while updating sprint.';
          this.sprintSaving = false;
        },
      });
      return;
    }

    this.sprintService.createSprint(payload).subscribe({
      next: () => {
        this.success = 'Sprint created successfully.';
        this.sprintSaving = false;
        this.cancelSprintForm();
        this.loadDashboardData();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error while creating sprint.';
        this.sprintSaving = false;
      },
    });
  }

  deleteSprint(sprint: Sprint): void {
    if (!this.canDeleteSprint(sprint)) {
      this.error = 'You can delete a sprint only when it is pending.';
      this.cdr.detectChanges();
      return;
    }

    if (!confirm(`Delete sprint "${sprint.name}" ?`)) {
      return;
    }

    this.clearMessages();
    this.sprintService.deleteSprint(sprint.id).subscribe({
      next: () => {
        this.success = 'Sprint deleted successfully.';
        this.loadDashboardData();
          this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error while deleting sprint.';
        this.cdr.detectChanges();
      },
    });
  }

  openCreateTask(): void {
    this.taskEditId = null;
    this.showTaskForm = true;
    this.taskForm = this.getEmptyTaskForm();
  }

  openEditTask(task: TaskDto): void {
    this.taskEditId = task.id;
    this.showTaskForm = true;
    this.taskForm = {
      title: task.title,
      description: task.description,
      estimatedHours: Number(task.estimatedHours ?? 1),
      status: this.normalizeTaskState(task.status),
      complexity: Number(task.complexity ?? 1),
      startDate: this.toDateInput(task.startDate),
      endDate: this.toDateInput(task.endDate),
      userStoryId: Number(task.userStoryId),
      sprintId: task.sprintId ? Number(task.sprintId) : null,
      assignedToUserId: task.assignedToId ? Number(task.assignedToId) : null,
    };
  }

  cancelTaskForm(): void {
    this.showTaskForm = false;
    this.taskEditId = null;
    this.taskForm = this.getEmptyTaskForm();
  }

  submitTask(): void {
    if (!this.taskForm.title.trim() || this.taskForm.userStoryId <= 0) {
      this.error = 'Task title and user story are required.';
      return;
    }

    if (!this.scopedUserStoryIds.has(Number(this.taskForm.userStoryId))) {
      this.error = 'You can only create tasks in your own user stories.';
      return;
    }

    if (this.taskForm.sprintId && !this.scopedSprintIds.has(Number(this.taskForm.sprintId))) {
      this.error = 'You can only select your own sprints.';
      return;
    }

    if (new Date(this.taskForm.endDate) < new Date(this.taskForm.startDate)) {
      this.error = 'End date must be after or equal to start date.';
      return;
    }

    if (!this.isDateInRange(this.taskForm.startDate, this.taskMinDateInput, this.taskMaxDateInput)
      || !this.isDateInRange(this.taskForm.endDate, this.taskMinDateInput, this.taskMaxDateInput)) {
      this.error = 'Task dates are outside the allowed range.';
      return;
    }

    this.taskSaving = true;
    this.clearMessages();

    const payload: CreateTaskRequest = {
      title: this.taskForm.title.trim(),
      description: this.taskForm.description.trim(),
      estimatedHours: Number(this.taskForm.estimatedHours),
      status: this.normalizeTaskState(this.taskForm.status),
      complexity: Number(this.taskForm.complexity),
      startDate: this.taskForm.startDate,
      endDate: this.taskForm.endDate,
      userStoryId: Number(this.taskForm.userStoryId),
      sprintId: this.taskForm.sprintId ? Number(this.taskForm.sprintId) : null,
      assignedToId: this.taskForm.assignedToUserId ? Number(this.taskForm.assignedToUserId) : null,
    };

    if (this.taskEditId) {
      const updatePayload: UpdateTaskRequest = { id: this.taskEditId, ...payload };
      this.taskService.update(updatePayload).subscribe({
        next: () => {
          this.applyTaskLocally(payload, this.taskEditId ?? 0);
          this.success = 'Task updated successfully.';
          this.taskSaving = false;
          this.cancelTaskForm();
          this.loadDashboardData();
          this.cdr.detectChanges();
        },


        error: (err) => {
          this.error = err?.error?.message || 'Error while updating task.';
          this.taskSaving = false;
          this.cdr.detectChanges();
        },

      });
      return;
    }

    this.taskService.create(payload).subscribe({
      next: (created) => {
        this.applyTaskLocally(payload, Number(created?.id ?? 0));
        this.success = 'Task created successfully.';
        this.taskSaving = false;
        this.cancelTaskForm();
        this.loadDashboardData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error while creating task.';
        this.taskSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteTask(task: TaskDto): void {
    if (!this.canDeleteTask(task)) {
      this.error = 'You can delete a task only when it is pending.';
      this.cdr.detectChanges();
      return;
    }

    if (!confirm(`Delete task "${task.title}" ?`)) {
      return;
    }

    this.clearMessages();
    this.taskService.delete(task.id).subscribe({
      next: () => {
        this.success = 'Task deleted successfully.';
        this.loadDashboardData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error while deleting task.';
        this.cdr.detectChanges();
      },
    });
  }

  recomputeSprintDuration(): void {
    const start = new Date(this.sprintForm.startDate);
    const end = new Date(this.sprintForm.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      this.sprintForm.estimatedDuration = 0;
      return;
    }

    const diff = end.getTime() - start.getTime();
    this.sprintForm.estimatedDuration = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  onSprintStartDateChange(): void {
    if (this.sprintForm.endDate && this.sprintForm.endDate < this.sprintForm.startDate) {
      this.sprintForm.endDate = this.sprintForm.startDate;
    }
    this.recomputeSprintDuration();
  }

  onTaskStartDateChange(): void {
    if (this.taskForm.endDate && this.taskForm.endDate < this.taskForm.startDate) {
      this.taskForm.endDate = this.taskForm.startDate;
    }
  }

  onTaskUserStoryChange(): void {
    const minDate = this.taskMinDateInput;
    const maxDate = this.taskMaxDateInput;

    if (!this.isDateInRange(this.taskForm.startDate, minDate, maxDate)) {
      this.taskForm.startDate = minDate || this.taskForm.startDate;
    }

    if (!this.isDateInRange(this.taskForm.endDate, minDate, maxDate)) {
      this.taskForm.endDate = this.taskForm.startDate;
    }
  }

  getProjectName(projectId: number): string {
    const item = this.projects.find((project) => Number(project.id) === Number(projectId));
    return item?.name ?? 'Unknown project';
  }

  getSprintName(sprintId?: number | null): string {
    if (!sprintId) {
      return 'Unassigned';
    }
    const sprint = this.sprints.find((item) => item.id === Number(sprintId));
    return sprint?.name ?? `Sprint #${sprintId}`;
  }

  getUserStoryName(userStoryId: number): string {
    const story = this.userStories.find((item) => Number(item.id) === Number(userStoryId));
    return story?.name || story?.title || `US #${userStoryId}`;
  }

  getUserStoryStatusDisplay(story: UserStoryDto): string {
    const stateValue = Number((story as any)?.userStoryState ?? -1);
    const stateMap: Record<number, string> = {
      0: 'Pending',
      1: 'To Do',
      2: 'In Progress',
      3: 'Done',
      4: 'Validated',
    };

    if (stateMap[stateValue]) {
      return stateMap[stateValue];
    }

    const status = String(story?.status ?? '').trim();
    return status || 'To Do';
  }

  isUserStoryDone(story: UserStoryDto): boolean {
    const statusText = String(story?.status ?? '').toLowerCase();
    const stateValue = Number((story as any)?.userStoryState ?? -1);
    return statusText.includes('done') || stateValue === 3 || stateValue === 4;
  }

  getUserStoryAssignee(story: UserStoryDto): string {
    const assignedName = String((story as any)?.assignedToName ?? '').trim();
    if (assignedName) {
      return assignedName;
    }

    const assignedId = Number((story as any)?.assignedToId ?? 0);
    if (!assignedId) {
      return 'Unassigned';
    }

    const assignedUser = this.employeeUsers.find((user) => Number(user.id) === assignedId);
    return assignedUser ? this.getEmployeeLabel(assignedUser) : `User #${assignedId}`;
  }

  getUserStoryTaskCount(story: UserStoryDto): number {
    const storyId = Number(story?.id ?? 0);
    if (!storyId) {
      return 0;
    }

    return this.tasks.filter((task) => Number(task.userStoryId) === storyId).length;
  }

  getUserStoryCompletedTaskCount(story: UserStoryDto): number {
    const storyId = Number(story?.id ?? 0);
    if (!storyId) {
      return 0;
    }

    return this.tasks.filter((task) => {
      if (Number(task.userStoryId) !== storyId) {
        return false;
      }

      const status = this.normalizeTaskState(task.status);
      return status === 'done' || status === 'validated';
    }).length;
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

    const assignedUser = this.employeeUsers.find((user) => Number(user.id) === assignedId);
    if (assignedUser) {
      return this.getEmployeeLabel(assignedUser);
    }

    return `User #${assignedId}`;
  }

  canMessageAssignedEmployee(task: TaskDto): boolean {
    const assignedId = Number((task as any)?.assignedToId ?? 0);
    return assignedId > 0 && !this.isTaskCompleted(task);
  }

  toggleTaskMessageComposer(task: TaskDto): void {
    const taskId = Number(task.id ?? 0);
    if (!taskId || !this.canMessageAssignedEmployee(task)) {
      return;
    }

    this.clearMessages();
    this.showTaskMessageComposerForId = this.showTaskMessageComposerForId === taskId ? null : taskId;
  }

  sendMessageToTaskAssignee(task: TaskDto): void {
    const taskId = Number(task.id ?? 0);
    const assignedId = Number((task as any)?.assignedToId ?? 0);
    if (!taskId || assignedId <= 0) {
      this.error = 'Assigned employee not found for this task.';
      return;
    }

    const message = (this.taskMessageDraftByTaskId[taskId] ?? '').trim();
    if (!message) {
      this.error = 'Please enter a message before sending.';
      return;
    }

    this.clearMessages();
    this.sendingTaskMessageId = taskId;

    this.notificationService.sendDirectMessage({
      recipientUserId: assignedId,
      taskId,
      title: `Project manager message - ${task.title}`,
      message,
    }).subscribe({
      next: () => {
        this.success = `Message sent to ${this.getTaskAssigneeName(task)}.`;
        this.taskMessageDraftByTaskId[taskId] = '';
        this.showTaskMessageComposerForId = null;
        this.sendingTaskMessageId = null;
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Unable to send message to employee.';
        this.sendingTaskMessageId = null;
      }
    });
  }

  isTaskCompleted(task: TaskDto): boolean {
    const status = this.normalizeTaskState(task.status);
    return status === 'done' || status === 'validated';
  }

  getSprintStateLabel(state: State): string {
    const found = this.sprintStateOptions.find((option) => option.value === state);
    return found?.label ?? 'Unknown';
  }

  isSprintStateOptionDisabled(option: { value: State; autoManaged: boolean }): boolean {
    if (option.autoManaged) {
      return true;
    }

    
    if (!this.sprintEditId && option.value === State.validated) {
      return true;
    }

    return false;
  }

  getTaskStatusLabel(status: TaskState): string {
    const normalized = this.normalizeTaskState(status);
    const found = this.taskStatusOptions.find((option) => option.value === normalized);
    return found?.label ?? String(status);
  }

  getSprintStateClass(state: State): string {
    if (state === State.done || state === State.validated) {
      return 'state-done';
    }
    if (state === State.inProgress) {
      return 'state-progress';
    }
    return 'state-pending';
  }

  getTaskStatusClass(status: TaskState): string {
    const normalized = this.normalizeTaskState(status);
    if (normalized === 'done' || normalized === 'validated') {
      return 'state-done';
    }
    if (normalized === 'inProgress') {
      return 'state-progress';
    }
    return 'state-pending';
  }

  canDeleteSprint(sprint: Sprint): boolean {
    return sprint.sprintState === State.pending;
  }

  canDeleteTask(task: TaskDto): boolean {
    return this.normalizeTaskState(task.status) === 'pending';
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

  getCalendarEventTypeLabel(type: CalendarEventType): string {
    if (type === 'task') {
      return 'Task';
    }
    return 'Task';
  }

  private loadSprints(): void {
    this.sprintService.getAllSprints().subscribe({
      next: (data) => {
        this.sprints = data.filter((sprint) => this.scopedProjectIds.has(Number(sprint.projectId)));
        this.scopedSprintIds = new Set(this.sprints.map((item) => Number(item.id)));
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Unable to reload sprints.';
        this.cdr.detectChanges();
      },
    });
  }

  private loadTasks(): void {
    this.taskService.getAll().subscribe({
      next: (data) => {
        this.tasks = data.filter((task) => {
          const taskSprintId = Number(task.sprintId ?? 0);
          const taskUserStoryId = Number(task.userStoryId ?? 0);
          return this.scopedSprintIds.has(taskSprintId) || this.scopedUserStoryIds.has(taskUserStoryId);
        
        });
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Unable to reload tasks.';
        this.cdr.detectChanges();
      },
    });
  }

  private applyTaskLocally(payload: CreateTaskRequest, taskId: number): void {
    if (!taskId) {
      return;
    }

    const normalizedStatus = this.normalizeTaskState(payload.status);
    const assignedToId = payload.assignedToId != null ? Number(payload.assignedToId) : null;
    const assignedUser = this.employeeUsers.find((user) => Number(user.id) === Number(assignedToId));

    const nextTask: TaskDto = {
      id: taskId,
      title: payload.title,
      description: payload.description,
      status: normalizedStatus,
      taskState: normalizedStatus,
      estimatedHours: Number(payload.estimatedHours ?? 0),
      complexity: Number(payload.complexity ?? 1),
      startDate: payload.startDate,
      endDate: payload.endDate,
      userStoryId: Number(payload.userStoryId),
      sprintId: payload.sprintId != null ? Number(payload.sprintId) : null,
      assignedToId,
      assignedToName: assignedUser ? this.getEmployeeLabel(assignedUser) : null,
    };

    const isInScope = this.scopedUserStoryIds.has(Number(nextTask.userStoryId))
      || this.scopedSprintIds.has(Number(nextTask.sprintId ?? 0));

    const existingIndex = this.tasks.findIndex((task) => Number(task.id) === Number(taskId));

    if (!isInScope) {
      if (existingIndex >= 0) {
        this.tasks = this.tasks.filter((task) => Number(task.id) !== Number(taskId));
      }
      return;
    }

    if (existingIndex >= 0) {
      this.tasks = this.tasks.map((task) => (Number(task.id) === Number(taskId) ? nextTask : task));
      return;
    }

    this.tasks = [nextTask, ...this.tasks];
  }

  private applyScopedData(projects: project[], sprints: Sprint[], tasks: TaskDto[], userStories: UserStoryDto[]): void {
    const ownedProjects = projects.filter(
      (item) => Number((item as any)?.projectManagerId ?? (item as any)?.ProjectManagerId ?? 0) === Number(this.currentManagerId)
    );

    this.projects = ownedProjects;
    this.scopedProjectIds = new Set(ownedProjects.map((item) => Number((item as any)?.id ?? (item as any)?.Id ?? 0)).filter((id) => id > 0));

    this.sprints = sprints.filter((item) => this.scopedProjectIds.has(Number(item.projectId)));
    this.scopedSprintIds = new Set(this.sprints.map((item) => Number(item.id)));

    const userStoryIdsFromScopedSprints = new Set(
      tasks
        .filter((task) => {
          const taskProjectId = Number((task as any)?.projectId ?? 0);
          const taskSprintId = Number(task.sprintId ?? 0);
          return taskProjectId > 0 && this.scopedProjectIds.has(taskProjectId) || taskSprintId > 0 && this.scopedSprintIds.has(taskSprintId);
        })
        .map((task) => Number((task as any)?.userStoryId ?? 0))
        .filter((id) => id > 0)
    );

    this.userStories = userStories.filter((story) => {
      const storyProjectId = Number((story as any)?.projectId ?? (story as any)?.ProjectId ?? 0);
      const storySprintId = Number((story as any)?.sprintId ?? (story as any)?.SprintId ?? 0);
      const storyId = Number((story as any)?.id ?? (story as any)?.Id ?? 0);
      if (storyProjectId > 0) {
        return this.scopedProjectIds.has(storyProjectId);
      }

      if (this.scopedSprintIds.has(storySprintId)) {
        return true;
      }

      return userStoryIdsFromScopedSprints.has(storyId);
    });
    this.scopedUserStoryIds = new Set(this.userStories.map((item) => Number((item as any)?.id ?? (item as any)?.Id ?? 0)).filter((id) => id > 0));

    this.tasks = tasks.filter((task) => {
      const taskProjectId = Number((task as any)?.projectId ?? 0);
      const taskSprintId = Number(task.sprintId ?? 0);
      const taskUserStoryId = Number(task.userStoryId ?? 0);
      return (taskProjectId > 0 && this.scopedProjectIds.has(taskProjectId)) || this.scopedSprintIds.has(taskSprintId) || this.scopedUserStoryIds.has(taskUserStoryId);
    });

    if (this.selectedProjectFilter !== 'all' && !this.scopedProjectIds.has(Number(this.selectedProjectFilter))) {
      this.selectedProjectFilter = 'all';
    }

    if (this.selectedSprintFilter !== 'all' && !this.scopedSprintIds.has(Number(this.selectedSprintFilter))) {
      this.selectedSprintFilter = 'all';
    }

    if (this.taskForm.userStoryId > 0 && !this.scopedUserStoryIds.has(Number(this.taskForm.userStoryId))) {
      this.taskForm.userStoryId = this.userStories.length > 0 ? Number((this.userStories[0] as any)?.id ?? (this.userStories[0] as any)?.Id ?? 0) : 0;
    }

    if (this.taskForm.sprintId && !this.scopedSprintIds.has(Number(this.taskForm.sprintId))) {
      this.taskForm.sprintId = null;
    }
  }

  private resolveCurrentManagerId(): number | null {
    const userData = this.tokenService.getUserData();
    const userId = Number(userData?.userId ?? userData?.id ?? 0);
    return Number.isFinite(userId) && userId > 0 ? userId : null;
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

  private getEmptySprintForm(): SprintFormModel {
    const today = new Date().toISOString().slice(0, 10);
    return {
      name: '',
      description: '',
      startDate: today,
      endDate: today,
      estimatedDuration: 0,
      sprintState: State.pending,
      projectId: 0,
    };
  }

  private getEmptyTaskForm(): TaskFormModel {
    const today = new Date().toISOString().slice(0, 10);
    return {
      title: '',
      description: '',
      estimatedHours: 1,
      status: 'pending',
      complexity: 1,
      startDate: today,
      endDate: today,
      userStoryId: 0,
      sprintId: null,
      assignedToUserId: null,
    };
  }

  private getEmptyPasswordForm(): ChangePasswordFormModel {
    return {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    };
  }

  getEmployeeLabel(user: UserDto): string {
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return fullName || user.email || `User #${user.id}`;
  }

  private isEmployeeRole(role?: string | number | null): boolean {
    if (typeof role === 'number') {
      return role === 3;
    }

    const normalized = String(role ?? '').trim().toLowerCase();
    return normalized === '3' || normalized === 'employee' || normalized === 'employer' || normalized === 'developer';
  }

  private toDateInput(value?: Date | string): string {
    if (!value) {
      return new Date().toISOString().slice(0, 10);
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
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getSelectedTaskUserStory(): UserStoryDto | undefined {
    return this.filteredUserStories.find((item) => Number((item as any)?.id ?? (item as any)?.Id ?? 0) === Number(this.taskForm.userStoryId));
  }

  private loadUserStoriesForProjects(projectIds: number[]): Observable<UserStoryDto[]> {
    if (!projectIds.length) {
      return of([] as UserStoryDto[]);
    }

    const requests = projectIds.map((projectId) =>
      this.userStoryService.getByProjectId(projectId).pipe(catchError(() => of([] as UserStoryDto[])))
    );

    return forkJoin(requests).pipe(
      map((results) => {
        const merged = (results ?? []).flatMap((items) => (Array.isArray(items) ? items : []));
        const uniqueById = new Map<number, UserStoryDto>();

        merged.forEach((story) => {
          const storyId = Number((story as any)?.id ?? (story as any)?.Id ?? 0);
          if (storyId > 0 && !uniqueById.has(storyId)) {
            uniqueById.set(storyId, story);
          }
        });

        return Array.from(uniqueById.values());
      })
    );
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

  private buildCalendarDays(): CalendarDayCell[] {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startDayOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStartDate = this.addDays(firstOfMonth, -startDayOffset);
    const todayIso = this.toIsoDateLocal(new Date());

    const days: CalendarDayCell[] = [];

    for (let index = 0; index < 42; index += 1) {
      const date = this.addDays(gridStartDate, index);
      const iso = this.toIsoDateLocal(date);

      days.push({
        date,
        iso,
        dayNumber: date.getDate(),
        inCurrentMonth: date.getMonth() === month,
        isToday: iso === todayIso,
        isSelected: iso === this.selectedCalendarDateIso,
        events: this.getEventsForDate(iso),
      });
    }

    return days;
  }

  private getEventsForDate(dateIso: string): CalendarEventItem[] {
    return this.getCalendarEvents().filter((event) => dateIso >= event.startIso && dateIso <= event.endIso);
  }

  private getCalendarEvents(): CalendarEventItem[] {
    const events: CalendarEventItem[] = [];

    this.tasks.forEach((task) => {
      const taskId = Number(task.id ?? 0);
      const startIso = this.getSafeIsoDate(task.startDate);
      const endIso = this.getSafeIsoDate(task.endDate);
      const normalizedStatus = this.normalizeTaskState(task.status);
      if (!startIso || !endIso) {
        return;
      }
      events.push({
        id: `task-${taskId}`,
        title: task.title,
        type: 'task',
        startIso,
        endIso,
        meta: `${this.getTaskStatusLabel(normalizedStatus)} - ${this.getTaskAssigneeName(task)} - ${this.getUserStoryName(task.userStoryId)}`,
        className: `cal-event-task ${this.getCalendarTaskStateClass(normalizedStatus)}`,
      });
    });

    return events.sort((a, b) => {
      if (a.startIso === b.startIso) {
        return a.title.localeCompare(b.title);
      }
      return a.startIso.localeCompare(b.startIso);
    });
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  private getCalendarTaskStateClass(status: TaskState): string {
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

  private toIsoDateLocal(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private clearMessages(): void {
    this.error = '';
    this.success = '';
  }

  private initializeNotifications(): void {
    this.notificationCountSubscription?.unsubscribe();
    this.notificationsSubscription?.unsubscribe();

    this.notificationCountSubscription = this.notificationService.unreadCount$.subscribe((count) => {
      this.notificationCount = count;
      this.cdr.detectChanges();
    });

    this.notificationsSubscription = this.notificationService.notifications$.subscribe((items) => {
      this.notifications = items;
      this.cdr.detectChanges();
    });

    this.refreshNotifications();
  }

  private refreshNotifications(): void {
    const userId = this.resolveCurrentManagerId();
    if (!userId) {
      this.notificationCount = 0;
      this.notifications = [];
      return;
    }

    this.notificationService.loadNotifications(userId);
  }

  private getCurrentProjectTeamId(): number {
    const current = this.currentProject;
    if (!current) {
      return 0;
    }

    const directTeamId = Number(current.teamId ?? 0);
    if (directTeamId > 0) {
      return directTeamId;
    }

    const nestedTeamId = Number((current as any)?.team?.id ?? 0);
    return nestedTeamId > 0 ? nestedTeamId : 0;
  }

  private preloadDeclaredTeamMembers(): void {
    const teamIds = Array.from(new Set(
      this.projects
        .map((item) => {
          const directTeamId = Number(item.teamId ?? 0);
          if (directTeamId > 0) {
            return directTeamId;
          }

          return Number((item as any)?.team?.id ?? 0);
        })
        .filter((id) => id > 0)
    ));

    if (teamIds.length === 0) {
      this.teamMemberNamesByTeamId = {};
      this.teamMembersByTeamId = {};
      return;
    }

    const requests = teamIds.map((teamId) =>
      this.teamService.getMembersByTeamId(teamId).pipe(catchError(() => of([] as TeamUser[])))
    );

    forkJoin(requests).subscribe({
      next: (membersByTeam) => {
        const mapByTeamId: Record<number, string[]> = {};
        const usersByTeamId: Record<number, UserDto[]> = {};

        membersByTeam.forEach((members, index) => {
          const teamId = teamIds[index];
          const userMap = new Map<number, UserDto>();

          (Array.isArray(members) ? members : []).forEach((member) => {
            const userId = Number(member?.userId ?? member?.user?.id ?? 0);
            if (!userId) {
              return;
            }

            const firstName = String(member?.user?.firstName ?? '').trim();
            const lastName = String(member?.user?.lastName ?? '').trim();
            const email = String(member?.user?.email ?? '').trim();
            const roleValue = member?.user?.role ?? member?.role;

            userMap.set(userId, {
              id: userId,
              firstName,
              lastName,
              email,
              role: roleValue != null ? String(roleValue) : undefined,
            });
          });

          const users = Array.from(userMap.values());
          usersByTeamId[teamId] = users;
          mapByTeamId[teamId] = users.map((user) => this.getEmployeeLabel(user));
        });

        this.teamMemberNamesByTeamId = mapByTeamId;
        this.teamMembersByTeamId = usersByTeamId;
        this.cdr.detectChanges();
      },
      error: () => {
        this.teamMemberNamesByTeamId = {};
        this.teamMembersByTeamId = {};
        this.cdr.detectChanges();
      }
    });
  }
  

}