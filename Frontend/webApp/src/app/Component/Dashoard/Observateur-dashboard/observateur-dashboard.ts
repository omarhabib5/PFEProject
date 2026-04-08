import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { AuthService } from '../../Auth/Service/auth.service';
import { TokenService } from '../../Auth/Service/token.service';
import { Notification } from '../../Page/Notifiation/Models/Notification.Model';
import { NotificationService } from '../../Page/Notifiation/Service/NotifcationService';
import { project, ProjectService } from '../../Page/Projet/Service/ProjectService';
import { Sprint, SprintService } from '../../Page/Sprint/Service/SprintService';
import { TaskDto, TaskService } from '../../Page/Task/Service/TaskService';
import { UserApiService } from '../../Page/Team/Service/UserApiService';
import { UserStoryDto } from '../../Page/UserStory/Models/userstory.model';
import { UserStoryService } from '../../Page/UserStory/Service/UserStoryService';
import { KanbanComponent } from '../../kanban/kanban';

type ObserverTab = 'projects' | 'sprints' | 'stories' | 'notifications' | 'calendar' | 'kanban' | 'messagerie' | 'settings';

interface MessagingContact {
  id: number;
  name: string;
}

interface CalendarCell {
  day: number;
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  hasDeadline: boolean;
}

@Component({
  selector: 'app-observateur-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, KanbanComponent],
  templateUrl: './observateur-dashboard.html',
  styleUrl: './observateur-dashboard.css'
})
export class ObserverDashboard implements OnInit {
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);
  private readonly authService = inject(AuthService);
  private readonly projectService = inject(ProjectService);
  private readonly sprintService = inject(SprintService);
  private readonly taskService = inject(TaskService);
  private readonly userApiService = inject(UserApiService);
  private readonly userStoryService = inject(UserStoryService);
  private readonly notificationService = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  activeTab: ObserverTab = 'projects';
  loading = false;
  error = '';
  today = new Date();
  currentMonth = new Date();
  calendarCells: CalendarCell[] = [];
  selectedCalendarDate: Date | null = null;
  settingsSuccess = '';
  passwordSaving = false;
  notificationCount = 0;
  conversationLoading = false;
  conversationSending = false;

  messagingContacts: MessagingContact[] = [];
  selectedMessagingUserId: number | null = null;
  conversationMessages: Notification[] = [];
  conversationDraft = '';
  conversationAttachmentName = '';
  conversationAttachmentDataUrl = '';

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };

  userName = 'Observer';
  selectedProjectId: number | 'all' = 'all';
  unreadNotifications = 0;
  notifications: Notification[] = [];

  projects: project[] = [];
  sprints: Sprint[] = [];
  stories: UserStoryDto[] = [];
  tasks: TaskDto[] = [];
   
  ngOnInit(): void {
    if (!this.tokenService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const userData = this.tokenService.getUserData();
    if (userData?.firstName || userData?.lastName) {
      this.userName = `${userData?.firstName ?? ''} ${userData?.lastName ?? ''}`.trim();
    }

    this.refreshNotifications();
    this.loadDashboardData();
  }

  setTab(tab: ObserverTab): void {
    this.activeTab = tab;
    if (tab === 'calendar') {
      this.buildCalendar();
    }
    if (tab === 'messagerie') {
      this.refreshMessagingContacts();
      if (this.selectedMessagingUserId) {
        this.loadConversationMessages();
      }
    }
    if (tab === 'settings') {
      this.settingsSuccess = '';
    }
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      projects: this.projectService.getAllProjects().pipe(catchError(() => of([] as project[]))),
      sprints: this.sprintService.getAllSprints().pipe(catchError(() => of([] as Sprint[]))),
      stories: this.userStoryService.getAllUserStories().pipe(catchError(() => of([] as UserStoryDto[]))),
      tasks: this.taskService.getAll().pipe(catchError(() => of([] as TaskDto[])))
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: ({ projects, sprints, stories, tasks }) => {
          this.projects = Array.isArray(projects) ? projects : [];
          this.sprints = Array.isArray(sprints) ? sprints : [];
          this.stories = Array.isArray(stories) ? stories : [];
          this.tasks = Array.isArray(tasks) ? tasks : [];
          if (this.selectedProjectId !== 'all' && !this.projects.some((project) => Number(project.id) === Number(this.selectedProjectId))) {
            this.selectedProjectId = 'all';
          }
          this.buildCalendar();
          this.refreshMessagingContacts();
          this.refreshNotifications();
        },
        error: () => {
          this.error = 'Unable to load observer dashboard data.';
        }
      });
  }

  setProjectFilter(value: number | 'all'): void {
    this.selectedProjectId = value;
    this.buildCalendar();
  }

  get filteredProjects(): project[] {
    if (this.selectedProjectId === 'all') {
      return this.projects;
    }

    return this.projects.filter((project) => Number(project.id) === Number(this.selectedProjectId));
  }

  get filteredSprints(): Sprint[] {
    if (this.selectedProjectId === 'all') {
      return this.sprints;
    }

    return this.sprints.filter((sprint) => Number(sprint.projectId) === Number(this.selectedProjectId));
  }

  get filteredStories(): UserStoryDto[] {
    if (this.selectedProjectId === 'all') {
      return this.stories;
    }

    const projectSprintIds = new Set(
      this.sprints
        .filter((sprint) => Number(sprint.projectId) === Number(this.selectedProjectId))
        .map((sprint) => Number(sprint.id))
    );

    return this.stories.filter((story) => {
      const projectId = Number((story as any).projectId ?? 0);
      const sprintId = Number(story.sprintId ?? 0);
      return projectId === Number(this.selectedProjectId) || projectSprintIds.has(sprintId);
    });
  }

  get filteredTasks(): TaskDto[] {
    if (this.selectedProjectId === 'all') {
      return this.tasks;
    }

    return this.tasks.filter((task) => this.getTaskProjectId(task) === Number(this.selectedProjectId));
  }

  get filteredProjectsCount(): number {
    return this.filteredProjects.length;
  }

  get calendarTitle(): string {
    return this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get selectedCalendarDateLabel(): string {
    if (!this.selectedCalendarDate) {
      return '';
    }

    return this.selectedCalendarDate.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  get selectedDayTasks(): TaskDto[] {
    if (!this.selectedCalendarDate) {
      return [];
    }

    return this.filteredTasks.filter((task) => {
      const dueDate = this.taskDueDate(task);
      return dueDate !== null && this.sameDate(dueDate, this.selectedCalendarDate);
    });
  }

  get displayedNotifications(): Notification[] {
    return this.notifications.slice(0, 8);
  }

  toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  get selectedProjectCard(): project | null {
    if (this.selectedProjectId === 'all') {
      return null;
    }

    return this.projects.find((item) => Number(item.id) === Number(this.selectedProjectId)) ?? null;
  }

  getProjectStateLabel(state: number | string | undefined): string {
    const normalized = Number(state ?? 0);
    if (normalized === 4) return 'Validated';
    if (normalized === 3) return 'Done';
    if (normalized === 2) return 'In progress';
    if (normalized === 1) return 'Planned';
    return 'Pending';
  }

  getProjectSprintCount(projectId: number): number {
    return this.sprints.filter((sprint) => Number(sprint.projectId) === Number(projectId)).length;
  }

  getProjectStoryCount(projectId: number): number {
    const sprintIds = new Set(
      this.sprints
        .filter((sprint) => Number(sprint.projectId) === Number(projectId))
        .map((sprint) => Number(sprint.id))
    );

    return this.stories.filter((story) => {
      const storyProjectId = Number((story as any).projectId ?? 0);
      const sprintId = Number(story.sprintId ?? 0);
      return storyProjectId === Number(projectId) || sprintIds.has(sprintId);
    }).length;
  }

  getProjectTaskCount(projectId: number): number {
    return this.filteredTasks.filter((task) => this.getTaskProjectId(task) === Number(projectId)).length;
  }

  getProjectDoneTaskCount(projectId: number): number {
    return this.filteredTasks.filter((task) => {
      if (this.getTaskProjectId(task) !== Number(projectId)) {
        return false;
      }

      const status = String(task.status ?? '').toLowerCase();
      return status === 'done' || status === 'validated';
    }).length;
  }

  getProjectProgressPercent(projectId: number): number {
    const total = this.getProjectTaskCount(projectId);
    if (total === 0) {
      return 0;
    }

    return Math.round((this.getProjectDoneTaskCount(projectId) / total) * 100);
  }

  getSprintStateLabel(state: number | string | undefined): string {
    const normalized = Number(state ?? 0);
    if (normalized === 4) return 'Validated';
    if (normalized === 3) return 'Done';
    if (normalized === 2) return 'In progress';
    if (normalized === 1) return 'Planned';
    return 'Pending';
  }

  getSprintStoryCount(sprintId: number): number {
    return this.stories.filter((story) => Number(story.sprintId ?? 0) === Number(sprintId)).length;
  }

  getSprintTaskCount(sprintId: number): number {
    return this.filteredTasks.filter((task) => Number(task.sprintId ?? 0) === Number(sprintId)).length;
  }

  getSprintProgressPercent(sprintId: number): number {
    const total = this.getSprintTaskCount(sprintId);
    if (total === 0) {
      return 0;
    }

    const done = this.filteredTasks.filter((task) => {
      if (Number(task.sprintId ?? 0) !== Number(sprintId)) {
        return false;
      }

      const status = String(task.status ?? '').toLowerCase();
      return status === 'done' || status === 'validated';
    }).length;

    return Math.round((done / total) * 100);
  }

  getStoryStatusLabel(story: UserStoryDto): string {
    const status = String(story.status ?? story.userStoryState ?? '').toLowerCase();
    if (status === 'done' || status === 'validated' || status === '4') return 'Done';
    if (status === 'review' || status === '3') return 'Review';
    if (status === 'in progress' || status === 'inprogress' || status === '2') return 'In progress';
    if (status === 'todo' || status === 'to do' || status === '1') return 'To do';
    return 'Pending';
  }

  getStoryPriorityLabel(priority: number | undefined): string {
    const normalized = Number(priority ?? 0);
    if (normalized >= 4) return 'Critical';
    if (normalized === 3) return 'High';
    if (normalized === 2) return 'Medium';
    if (normalized === 1) return 'Low';
    return 'Unspecified';
  }

  getStoryPriorityClass(priority: number | undefined): string {
    const normalized = Number(priority ?? 0);
    if (normalized >= 4) return 'critical';
    if (normalized === 3) return 'high';
    if (normalized === 2) return 'medium';
    if (normalized === 1) return 'low';
    return 'neutral';
  }

  getProjectDateRange(projectItem: project): string {
    const start = this.formatDate(projectItem.startDate);
    const end = this.formatDate(projectItem.endDate);
    return `${start} - ${end}`;
  }

  getSprintDateRange(sprint: Sprint): string {
    return `${this.formatDate(sprint.startDate)} - ${this.formatDate(sprint.endDate)}`;
  }

  getProjectManagerName(projectItem: project): string {
    const managerId = Number(projectItem.projectManagerId ?? 0);
    return projectItem.projectManager ? `${projectItem.projectManager.firstName ?? ''} ${projectItem.projectManager.lastName ?? ''}`.trim() || 'Project manager' : 'Project manager';
  }

  getProjectTeamName(projectItem: project): string {
    return projectItem.team?.name?.trim() || 'No team assigned';
  }

  getProjectSummaryLabel(projectItem: project): string {
    const taskCount = this.getProjectTaskCount(Number(projectItem.id ?? 0));
    const storyCount = this.getProjectStoryCount(Number(projectItem.id ?? 0));
    return `${storyCount} user stories · ${taskCount} tasks`;
  }

  getProjectName(projectId?: number): string {
    const match = this.projects.find((item) => Number(item.id) === Number(projectId ?? -1));
    return match?.name ?? '-';
  }

  getSprintName(sprintId?: string | number): string {
    const match = this.sprints.find((item) => Number(item.id) === Number(sprintId ?? -1));
    return match?.name ?? '-';
  }

  getStoryProjectId(story: UserStoryDto): number {
    return Number((story as any)?.projectId ?? 0);
  }

  getTaskProgress(story: UserStoryDto): string {
    const done = Number(story.completedTaskCount ?? 0);
    const total = Number(story.taskCount ?? 0);
    return `${done} / ${total}`;
  }

  getUserStoryName(storyId: number): string {
    const story = this.stories.find((item) => Number(item.id) === Number(storyId));
    return story?.name || story?.title || `US #${storyId}`;
  }

  getTaskProjectName(task: TaskDto): string {
    const projectId = this.getTaskProjectId(task);
    return projectId > 0 ? this.getProjectName(projectId) : '-';
  }

  getTaskStatusLabel(task: TaskDto): string {
    const status = String(task.status ?? '').toLowerCase();
    if (status === 'validated') return 'Validated';
    if (status === 'done') return 'Done';
    if (status === 'inprogress') return 'In progress';
    if (status === 'todo') return 'To do';
    return 'Not confirmed';
  }

  getTaskStatusClass(task: TaskDto): string {
    const status = String(task.status ?? '').toLowerCase();
    if (status === 'validated' || status === 'done') return 'done';
    if (status === 'inprogress') return 'inprogress';
    if (status === 'todo') return 'todo';
    return 'pending';
  }

  getTaskProjectId(task: TaskDto): number {
    const story = this.stories.find((item) => Number(item.id) === Number(task.userStoryId));
    const sprintId = Number(task.sprintId ?? story?.sprintId ?? 0);
    const sprint = this.sprints.find((item) => Number(item.id) === sprintId);
    return Number((story as any)?.projectId ?? sprint?.projectId ?? 0);
  }

  prevMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.buildCalendar();
  }

  goToCurrentCalendarMonth(): void {
    this.currentMonth = new Date();
    this.buildCalendar();
  }

  sameDate(left: Date, right: Date | null): boolean {
    if (!right) {
      return false;
    }

    return left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate();
  }

  selectCalendarDate(date: Date): void {
    this.selectedCalendarDate = date;
  }

  markNotificationAsRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => this.refreshNotifications(),
      error: () => this.error = 'Unable to mark notification as read.'
    });
  }

  markAllNotificationsAsRead(): void {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return;
    }

    this.notificationService.markAllAsRead(userId).subscribe({
      next: () => this.refreshNotifications(),
      error: () => this.error = 'Unable to mark all notifications as read.'
    });
  }

  savePasswordSettings(): void {
    const passwordError = this.validatePasswordForm();
    if (passwordError) {
      this.error = passwordError;
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
        this.settingsSuccess = 'Password updated successfully.';
        this.passwordForm = {
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        };
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.error = err instanceof Error ? err.message : 'Unable to change the password.';
        this.cdr.markForCheck();
      }
    });
  }

  get isPasswordFormValid(): boolean {
    return this.validatePasswordForm() === null;
  }

  get passwordHasMinLength(): boolean {
    return this.passwordForm.newPassword.trim().length >= 8;
  }

  get passwordHasUppercase(): boolean {
    return /[A-Z]/.test(this.passwordForm.newPassword);
  }

  get passwordHasLowercase(): boolean {
    return /[a-z]/.test(this.passwordForm.newPassword);
  }

  get passwordHasDigit(): boolean {
    return /\d/.test(this.passwordForm.newPassword);
  }

  refreshMessagingContacts(): void {
    this.userApiService.getUsers().subscribe({
      next: (users) => {
        this.messagingContacts = (users ?? [])
          .filter((user) => this.isEmployeeRole((user as any)?.role))
          .map((user) => {
            const id = Number((user as any)?.id ?? 0);
            const name = `${String((user as any)?.firstName ?? '').trim()} ${String((user as any)?.lastName ?? '').trim()}`.trim();
            return {
              id,
              name: name || `Employee #${id}`
            } as MessagingContact;
          })
          .filter((contact) => contact.id > 0)
          .sort((a, b) => a.name.localeCompare(b.name));

        if (this.selectedMessagingUserId && !this.messagingContacts.some((contact) => contact.id === this.selectedMessagingUserId)) {
          this.selectedMessagingUserId = null;
          this.conversationMessages = [];
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.messagingContacts = [];
        this.cdr.markForCheck();
      }
    });
  }

  selectMessagingUser(userId: number): void {
    this.selectedMessagingUserId = userId;
    this.conversationDraft = '';
    this.conversationAttachmentName = '';
    this.conversationAttachmentDataUrl = '';
    this.loadConversationMessages();
  }

  loadConversationMessages(): void {
    if (!this.selectedMessagingUserId || this.conversationLoading) {
      return;
    }

    this.error = '';
    this.conversationLoading = true;
    this.notificationService.getConversation(this.selectedMessagingUserId).subscribe({
      next: (items) => {
        this.conversationMessages = (items ?? []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        this.conversationLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Unable to load the conversation.';
        this.conversationLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  sendConversationMessage(): void {
    if (!this.selectedMessagingUserId) {
      return;
    }

    const text = this.conversationDraft.trim();
    const hasAttachment = this.conversationAttachmentDataUrl.trim().length > 0;
    if (!text && !hasAttachment) {
      this.error = 'Message or attachment is required.';
      this.cdr.markForCheck();
      return;
    }

    this.error = '';
    this.settingsSuccess = '';
    this.conversationSending = true;
    this.notificationService.sendDirectMessage({
      recipientUserId: this.selectedMessagingUserId,
      message: text,
      title: 'Observer message',
      attachmentName: hasAttachment ? this.conversationAttachmentName : undefined,
      attachmentDataUrl: hasAttachment ? this.conversationAttachmentDataUrl : undefined
    }).pipe(finalize(() => {
      this.conversationSending = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: () => {
        this.conversationDraft = '';
        this.clearConversationAttachment();
        this.settingsSuccess = 'Message sent successfully.';
        this.loadConversationMessages();
        this.refreshNotifications();
      },
      error: () => {
        this.error = 'Unable to send the message.';
        this.cdr.markForCheck();
      }
    });
  }

  getSelectedMessagingUserName(): string {
    if (!this.selectedMessagingUserId) {
      return 'Select an employee';
    }

    return this.messagingContacts.find((item) => item.id === this.selectedMessagingUserId)?.name ?? 'Employee';
  }

  isMessageSentByCurrentUser(item: Notification): boolean {
    return Number(item.relatedUserId ?? 0) === Number(this.getCurrentUserId() ?? 0);
  }

  hasAttachment(item: Notification): boolean {
    return typeof item.newValue === 'string' && item.newValue.trim().startsWith('data:');
  }

  getAttachmentHref(item: Notification): string {
    return typeof item.newValue === 'string' && item.newValue.trim().startsWith('data:') ? item.newValue : '';
  }

  onConversationAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    if (!file) {
      this.clearConversationAttachment();
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.error = 'The attachment must not exceed 10MB.';
      this.conversationAttachmentName = '';
      this.conversationAttachmentDataUrl = '';
      input.value = '';
      this.cdr.markForCheck();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.conversationAttachmentName = file.name;
      this.conversationAttachmentDataUrl = typeof reader.result === 'string' ? reader.result : '';
      this.error = '';
      this.cdr.markForCheck();
    };
    reader.onerror = () => {
      this.error = 'Unable to read the attached file.';
      this.clearConversationAttachment();
      input.value = '';
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  clearConversationAttachment(): void {
    this.conversationAttachmentName = '';
    this.conversationAttachmentDataUrl = '';
    const fileInput = document.getElementById('observerConversationAttachmentInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.cdr.markForCheck();
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) {
      return 'Not defined';
    }

    const parsed = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(parsed.getTime())) {
      return 'Not defined';
    }

    return parsed.toLocaleDateString('en-US');
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  private refreshNotifications(): void {
    const userId = this.getCurrentUserId();
    if (!userId) {
      this.notifications = [];
      this.unreadNotifications = 0;
      this.notificationCount = 0;
      return;
    }

    this.notificationService.getUserNotifications(userId).subscribe({
      next: (items) => {
        this.notifications = items;
        this.unreadNotifications = items.filter((item) => !item.isRead).length;
        this.notificationCount = this.unreadNotifications;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notifications = [];
        this.unreadNotifications = 0;
        this.notificationCount = 0;
        this.cdr.markForCheck();
      }
    });
  }

  private buildCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);
    const today = new Date();

    if (!this.selectedCalendarDate) {
      this.selectedCalendarDate = new Date();
    }

    this.calendarCells = Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        day: date.getDate(),
        date,
        inCurrentMonth: date.getMonth() === month,
        isToday: this.sameDate(date, today),
        hasDeadline: this.filteredTasks.some((task) => {
          const dueDate = this.taskDueDate(task);
          return dueDate !== null && this.sameDate(dueDate, date);
        })
      };
    });
  }

  private taskDueDate(task: TaskDto): Date | null {
    const raw = task.endDate;
    if (!raw) {
      return null;
    }

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getCurrentUserId(): number | null {
    const userData = this.tokenService.getUserData();
    const parsed = Number(userData?.userId ?? userData?.id ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private validatePasswordForm(): string | null {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmNewPassword) {
      return 'Please fill in all password fields.';
    }

    if (!this.passwordHasMinLength || !this.passwordHasUppercase || !this.passwordHasLowercase || !this.passwordHasDigit) {
      return 'The new password must include at least 8 characters, one uppercase letter, one lowercase letter, and one number.';
    }

    if (this.passwordForm.newPassword === this.passwordForm.currentPassword) {
      return 'The new password must be different from the current password.';
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmNewPassword) {
      return 'Password confirmation does not match.';
    }

    return null;
  }

  private isEmployeeRole(role: unknown): boolean {
    const normalized = String(role ?? '').trim().toLowerCase();
    return normalized === 'employee' || normalized === 'employe' || normalized === '3';
  }
}
