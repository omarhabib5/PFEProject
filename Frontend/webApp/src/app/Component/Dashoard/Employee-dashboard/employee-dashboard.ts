import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
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
import { NotificationService } from '../../Page/Notifiation/Service/NotifcationService';
import { Notification } from '../../Page/Notifiation/Models/Notification.Model';
import { KanbanComponent } from '../../kanban/kanban';

type SidebarSection = 'dashboard' | 'calendar' | 'notifications' | 'messagerie' | 'settings';
type EmployeeTab = 'overview' | 'tasks' | 'kanban' | 'projects' | 'sprints';
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

interface MessagingContact {
  id: number;
  name: string;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, KanbanComponent],
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
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private notificationCountSubscription: Subscription | null = null;
  private notificationsSubscription: Subscription | null = null;
  private conversationLoading = false;

  sidebarSection: SidebarSection = 'dashboard';
  activeTab: EmployeeTab = 'overview';

  loading = false;
  error = '';
  searchTerm = '';

  userName = 'Employe';
  roleLabel = 'Membre';
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
  apiNotifications: Notification[] = [];
  taskDelayMessageByTaskId: Record<number, string> = {};
  taskProjectManagerIdByTaskId: Record<number, number> = {};
  taskProjectManagerNameByTaskId: Record<number, string> = {};
  userNameById: Record<number, string> = {};
  showDelayMessageForTaskId: number | null = null;
  sendingDelayMessageTaskId: number | null = null;
  replyMessageByNotificationId: Record<number, string> = {};
  showReplyComposerForNotificationId: number | null = null;
  sendingReplyNotificationId: number | null = null;
  taskDelayAttachmentNameByTaskId: Record<number, string> = {};
  taskDelayAttachmentDataUrlByTaskId: Record<number, string> = {};
  replyAttachmentNameByNotificationId: Record<number, string> = {};
  replyAttachmentDataUrlByNotificationId: Record<number, string> = {};
  messagingContacts: MessagingContact[] = [];
  selectedMessagingUserId: number | null = null;
  conversationMessages: Notification[] = [];
  conversationDraft = '';
  conversationAttachmentName = '';
  conversationAttachmentDataUrl = '';
  conversationSending = false;

  statusFilter: 'all' | TaskBucket = 'all';
  priorityFilter: 'all' | 'basse' | 'moyenne' | 'haute' | 'urgente' = 'all';

  currentMonth = new Date();
  calendarCells: CalendarCell[] = [];
  selectedCalendarDate: Date | null = null;

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly bucketOrder: TaskBucket[] = ['todo', 'inProgress', 'review', 'done'];
  readonly bucketLabels: Record<TaskBucket, string> = {
    todo: 'To do',
    inProgress: 'In progress',
    review: 'To review',
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
    this.initializeNotifications();
    this.loadEmployeeData();
  }

  ngOnDestroy(): void {
    this.notificationCountSubscription?.unsubscribe();
    this.notificationCountSubscription = null;
    this.notificationsSubscription?.unsubscribe();
  }

  get pageTitle(): string {
    if (this.sidebarSection === 'calendar') return 'Calendar';
    if (this.sidebarSection === 'notifications') return 'Notifications';
    if (this.sidebarSection === 'messagerie') return 'Messaging';
    if (this.sidebarSection === 'settings') return 'Settings';
    return 'My dashboard';
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
    const candidates = this.myTasks.filter((task) => task.delayLabel.includes('In'));
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
    this.cdr.markForCheck();
    if (section === 'messagerie') {
      this.refreshMessagingContacts();
      if (this.selectedMessagingUserId) {
        this.loadConversationMessages();
      }
    }
    if (section === 'settings') {
      this.settingsSuccess = '';
      this.loadSettingsProfile();
    }
  }

  refreshMessagingContacts(): void {
    const mapById = new Map<number, string>();

    Object.entries(this.taskProjectManagerIdByTaskId).forEach(([taskId, managerIdRaw]) => {
      const managerId = Number(managerIdRaw ?? 0);
      if (managerId <= 0) {
        return;
      }

      const managerName = this.taskProjectManagerNameByTaskId[Number(taskId)]?.trim();
      mapById.set(managerId, managerName && managerName.length > 0 ? managerName : `Project manager #${managerId}`);
    });

    this.messagingContacts = Array.from(mapById.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (this.selectedMessagingUserId && !mapById.has(this.selectedMessagingUserId)) {
      this.selectedMessagingUserId = null;
      this.conversationMessages = [];
    }
    this.cdr.markForCheck();
  }

  selectMessagingUser(userId: number): void {
    this.selectedMessagingUserId = userId;
    this.conversationDraft = '';
    this.conversationAttachmentName = '';
    this.conversationAttachmentDataUrl = '';
    this.cdr.markForCheck();
    this.loadConversationMessages();
  }

  loadConversationMessages(): void {
    if (!this.selectedMessagingUserId) {
      this.conversationMessages = [];
      return;
    }

    if (this.conversationLoading) {
      return;
    }

    this.error = '';
    this.conversationLoading = true;
    this.cdr.markForCheck();
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

  onConversationAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    
    if (!file) {
      this.conversationAttachmentName = '';
      this.conversationAttachmentDataUrl = '';
      input.value = '';
      this.cdr.markForCheck();
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.error = 'La piece jointe ne doit pas depasser 10MB.';
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
      this.conversationAttachmentName = '';
      this.conversationAttachmentDataUrl = '';
      input.value = '';
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  clearConversationAttachment(): void {
    this.conversationAttachmentName = '';
    this.conversationAttachmentDataUrl = '';
    const fileInput = document.getElementById('conversationAttachmentInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.cdr.markForCheck();
  }

  sendConversationMessage(): void {
    if (!this.selectedMessagingUserId) {
      return;
    }

    const text = this.conversationDraft.trim();
    const hasAttachment = this.conversationAttachmentDataUrl.trim().length > 0;
    if (!text && !hasAttachment) {
      this.error = 'Message ou piece jointe obligatoire.';
      this.cdr.markForCheck();
      return;
    }

    this.error = '';
    this.settingsSuccess = '';
    this.conversationSending = true;
    this.cdr.markForCheck();

    this.notificationService.sendDirectMessage({
      recipientUserId: this.selectedMessagingUserId,
      message: text,
      title: 'Message employe',
      attachmentName: hasAttachment ? this.conversationAttachmentName : undefined,
      attachmentDataUrl: hasAttachment ? this.conversationAttachmentDataUrl : undefined,
    }).pipe(finalize(() => {
      this.conversationSending = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: () => {
        this.conversationDraft = '';
        this.clearConversationAttachment();
        this.loadConversationMessages();
        this.refreshNotifications();
        this.settingsSuccess = 'Message sent successfully.';
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.error = err?.status === 413
          ? 'La piece jointe est trop volumineuse pour le serveur. Essayez un fichier plus petit.'
          : (err?.error?.message || 'Unable to send the message.');
        this.cdr.markForCheck();
      }
    });
  }

  getSelectedMessagingUserName(): string {
    if (!this.selectedMessagingUserId) {
      return 'Select a project manager';
    }

    const contact = this.messagingContacts.find((item) => item.id === this.selectedMessagingUserId);
    const resolved = this.userNameById[this.selectedMessagingUserId]?.trim();
    return contact?.name ?? resolved ?? 'Project manager';
  }

  isMessageSentByCurrentUser(item: Notification): boolean {
    return Number(item.relatedUserId ?? 0) === Number(this.currentUserId ?? 0);
  }

  hasAttachment(item: Notification): boolean {
    const fromNewValue = typeof item.newValue === 'string' && item.newValue.trim().startsWith('data:');
    const fromLegacyLink = typeof item.link === 'string' && item.link.trim().startsWith('data:');
    return fromNewValue || fromLegacyLink;
  }

  getAttachmentHref(item: Notification): string {
    if (typeof item.newValue === 'string' && item.newValue.trim().startsWith('data:')) {
      return item.newValue;
    }

    if (typeof item.link === 'string' && item.link.trim().startsWith('data:')) {
      return item.link;
    }

    return '';
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

  get lastUpdatedLabel(): string {
    return 'Tableauaux de bord';
  }

  goToCurrentCalendarMonth(): void {
    this.currentMonth = new Date();
    this.buildCalendar();
  }

  getTaskStatusLabel(task: UiTask): string {
    return this.bucketLabels[task.bucket] || 'Inconnu';
  }

  getTaskAssigneeName(task: UiTask): string {
    const rawTask = this.allTasks.find(t => t.id === task.id);
    return rawTask?.assignedToName || 'Unassigned';
  }

  getUserStoryName(storyId: number): string {
    const story = this.userStories.find(s => Number(s.id) === storyId);
    return story?.name || `US #${storyId}`;
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
          this.settingsSuccess = 'Profil mis a jour avec succes.'
          this.cdr.markForCheck();
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
        this.error = 'Unable to update the profile.'
        this.cdr.markForCheck();
      }
    });
  }

  savePasswordSettings(): void {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmNewPassword) {
      this.error = 'Please fill in all password fields.'
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.error = 'The new password must contain at least 6 characters.'
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
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.error = err instanceof Error ? err.message : 'Unable to change the password.';
        this.cdr.markForCheck();
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
          this.error = 'Unable to update the task status.'
          this.cdr.markForCheck();
        }
      });
  }

  canNotifyTaskDelay(task: UiTask): boolean {
    const managerId = this.taskProjectManagerIdByTaskId[task.id] ?? 0;
    return managerId > 0 && task.bucket !== 'done';
  }

  toggleDelayMessageBox(task: UiTask): void {
    if (!this.canNotifyTaskDelay(task)) {
      return;
    }

    this.error = '';
    this.settingsSuccess = '';
    this.showDelayMessageForTaskId = this.showDelayMessageForTaskId === task.id ? null : task.id;
    this.cdr.markForCheck();
  }

  sendTaskDelayMessage(task: UiTask): void {
    const managerId = this.taskProjectManagerIdByTaskId[task.id] ?? 0;
    if (managerId <= 0) {
      this.error = 'Project manager not found for this task.';
      this.cdr.markForCheck();
      return;
    }

    const draft = (this.taskDelayMessageByTaskId[task.id] ?? '').trim();
    const attachmentDataUrl = (this.taskDelayAttachmentDataUrlByTaskId[task.id] ?? '').trim();
    const hasAttachment = attachmentDataUrl.length > 0;
    if (!draft && !hasAttachment) {
      this.error = 'Enter a message or attach a file before sending.';
      this.cdr.markForCheck();
      return;
    }

    this.error = '';
    this.settingsSuccess = '';
    this.sendingDelayMessageTaskId = task.id;
    this.cdr.markForCheck();

    this.notificationService.sendDirectMessage({
      recipientUserId: managerId,
      taskId: task.id,
      title: `Delay reported - ${task.title}`,
      message: draft,
      attachmentName: hasAttachment ? this.taskDelayAttachmentNameByTaskId[task.id] : undefined,
      attachmentDataUrl: hasAttachment ? attachmentDataUrl : undefined,
    }).pipe(finalize(() => {
      this.sendingDelayMessageTaskId = null;
      this.cdr.markForCheck();
    })).subscribe({
      next: () => {
        this.settingsSuccess = 'Message sent to the project manager.';
        this.taskDelayMessageByTaskId[task.id] = '';
        this.taskDelayAttachmentNameByTaskId[task.id] = '';
        this.taskDelayAttachmentDataUrlByTaskId[task.id] = '';
        this.showDelayMessageForTaskId = null;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Unable to send the message to the project manager.';
        this.cdr.markForCheck();
      }
    });
  }

  getTaskManagerName(task: UiTask): string {
    const name = this.taskProjectManagerNameByTaskId[task.id];
    if (name && name.trim().length > 0) {
      return name;
    }

    const managerId = Number(this.taskProjectManagerIdByTaskId[task.id] ?? 0);
    const fallbackName = managerId > 0 ? this.userNameById[managerId] : '';
    return fallbackName && fallbackName.trim().length > 0 ? fallbackName : 'Project manager';
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

    // Global safety timer - force stop loading after 20 seconds
    const globalTimeoutId = setTimeout(() => {
      if (this.loading) {
        console.warn('Dashboard loading timeout - forcing completion');
        this.loading = false;
        this.composeDashboard(this.allTasks, this.projectCards.map(card => ({
          id: card.id,
          name: card.name
        } as any)), [], [], []);
      }
    }, 20000);

    // Step 1: Load essential data (tasks, projects, services, users)
    forkJoin({
      tasks: this.taskService.getAll().pipe(
        timeout(8000),
        catchError(() => {
          console.warn('Failed to load tasks');
          return of([] as TaskDto[]);
        })
      ),
      projects: this.projectService.getAllProjects().pipe(
        timeout(8000),
        catchError(() => {
          console.warn('Failed to load projects');
          return of([] as ProjectEntity[]);
        })
      ),
      services: this.serviceService.getServices().pipe(
        timeout(5000),
        catchError(() => {
          console.warn('Failed to load services');
          return of([] as Service[]);
        })
      ),
      users: this.userApiService.getUsers().pipe(
        timeout(5000),
        catchError(() => {
          console.warn('Failed to load users');
          return of([] as Array<{ id: number; firstName?: string; lastName?: string }>);
        })
      )
    })
      .pipe(
        timeout(10000),
        finalize(() => {
          clearTimeout(globalTimeoutId);
        })
      )
      .subscribe({
        next: ({ tasks, projects, services, users }) => {
          // Build user name cache
          const userNameById: Record<number, string> = {};
          users.forEach((user) => {
            const id = Number(user?.id ?? 0);
            if (id <= 0) return;
            const fullName = `${String(user?.firstName ?? '').trim()} ${String(user?.lastName ?? '').trim()}`.trim();
            if (fullName.length > 0) {
              userNameById[id] = fullName;
            }
          });
          this.userNameById = userNameById;

          // Try to load sprints and stories in parallel, but don't wait for them
          this.loadOptionalSprintsAndStories(tasks, projects, services);

          // Display dashboard with what we have
          this.composeDashboard(tasks, projects, [], [], services);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to load core data:', err);
          this.loading = false;
          this.error = 'Unable to load data.';
          this.composeDashboard([], [], [], [], []);
        },
        complete: () => {
          this.loading = false;
        }
      });
  }

  private loadOptionalSprintsAndStories(
    tasks: TaskDto[],
    projects: ProjectEntity[],
    services: Service[]
  ): void {
    const projectIds = projects
      .map((p) => p.id)
      .filter((id): id is number => typeof id === 'number' && id > 0);

    if (projectIds.length === 0) {
      return; // No projects, skip sprints/stories
    }

    // Load sprints with aggressive timeout
    const sprintRequests = projectIds.map((projectId) =>
      this.sprintService
        .getSprintsByProjectId(projectId)
        .pipe(
          timeout(2000),
          catchError(err => {
            console.warn(`Failed to load sprints for project ${projectId}:`, err);
            return of([] as SprintEntity[]);
          })
        )
    );

    forkJoin(sprintRequests)
      .pipe(timeout(5000))
      .subscribe({
        next: (sprintsByProject) => {
          const sprints = sprintsByProject.flat();
          const sprintIds = sprints
            .map((s) => s.id)
            .filter((id): id is number => typeof id === 'number' && id > 0);

          if (sprintIds.length === 0) {
            return; // No sprints, skip stories
          }

          // Load stories
          const storyRequests = sprintIds.map((sprintId) =>
            this.userStoryService
              .getBySprintId(sprintId)
              .pipe(
                timeout(2000),
                catchError(err => {
                  console.warn(`Failed to load stories for sprint ${sprintId}:`, err);
                  return of([] as UserStoryDto[]);
                })
              )
          );

          forkJoin(storyRequests)
            .pipe(timeout(5000))
            .subscribe({
              next: (storiesBySprint) => {
                // Update dashboard with sprints and stories
                this.composeDashboard(tasks, projects, sprints, storiesBySprint.flat(), services);
                this.cdr.markForCheck();
              },
              error: (err) => {
                console.warn('Failed to load stories:', err);
                // Update with sprints but no stories
                this.composeDashboard(tasks, projects, sprints, [], services);
                this.cdr.markForCheck();
              }
            });
        },
        error: (err) => {
          console.warn('Failed to load sprints:', err);
          // Continue without sprints/stories
          this.cdr.markForCheck();
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

    const managerIdByTaskId: Record<number, number> = {};
    const managerNameByTaskId: Record<number, string> = {};
    mine.forEach((task) => {
      const story = storyById.get(task.userStoryId);
      const sprint = (task.sprintId ? sprintById.get(task.sprintId) : null)
        ?? (story?.sprintId ? sprintById.get(Number(story.sprintId)) : null);
      const projectId = Number((sprint as any)?.projectId ?? 0);
      if (projectId <= 0) {
        return;
      }

      const project = projectById.get(projectId);
      const managerId = Number((project as any)?.projectManagerId ?? (project as any)?.projectManager?.id ?? 0);
      if (managerId > 0) {
        managerIdByTaskId[task.id] = managerId;
      }

      const managerFirstName = String((project as any)?.projectManager?.firstName ?? '').trim();
      const managerLastName = String((project as any)?.projectManager?.lastName ?? '').trim();
      const managerNameFromProject = `${managerFirstName} ${managerLastName}`.trim();
      const managerName = managerNameFromProject || (managerId > 0 ? String(this.userNameById[managerId] ?? '').trim() : '');
      if (managerName) {
        managerNameByTaskId[task.id] = managerName;
      }
    });
    this.taskProjectManagerIdByTaskId = managerIdByTaskId;
    this.taskProjectManagerNameByTaskId = managerNameByTaskId;
    this.refreshMessagingContacts();

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
      const activeSprint = this.toActiveSprint(projectSprints, stories, project?.name ?? 'Project');

      const manager = (project?.projectManager as any) ? `${(project?.projectManager as any).firstName ?? ''} ${(project?.projectManager as any).lastName ?? ''}`.trim() : 'Unassigned';
      const dueDate = this.toFrDate((project as any)?.endDate);

      return {
        id: projectId,
        name: project?.name ?? `Project ${projectId}`,
        description: project?.description ?? 'No description',
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
          projectName: projectById.get(Number((sprint as any).projectId ?? 0))?.name ?? 'Project',
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
    this.serviceLabel = myServiceNames.length > 0 ? myServiceNames.join(', ') : 'Service not defined';

    this.syncNotificationsForView();
    this.buildCalendar();
    this.loading = false;
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
          message: `Priorite ${task.priorityLabel} : ${task.title}`,
          dateLabel: this.todayLabel
        });
      }
      if (task.delayLabel.startsWith('En retard')) {
        notifications.push({
          level: 'info',
          message: `${task.title} est ${task.delayLabel.toLowerCase()}`,
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

  private initializeNotifications(): void {
    this.notificationCountSubscription?.unsubscribe();
    this.notificationsSubscription?.unsubscribe();

    this.notificationCountSubscription = this.notificationService.unreadCount$.subscribe((count) => {
      this.unreadNotifications = count;
    });

    this.notificationsSubscription = this.notificationService.notifications$.subscribe((items) => {
      this.apiNotifications = items;
      this.syncNotificationsForView();
    });

    this.refreshNotifications();
  }

  private refreshNotifications(): void {
    const userId = this.currentUserId ?? this.resolveCurrentUserId();
    if (!userId) {
      this.apiNotifications = [];
      this.syncNotificationsForView();
      return;
    }

    this.notificationService.loadNotifications(userId);
  }

  private syncNotificationsForView(): void {
    if (this.apiNotifications.length > 0) {
      this.notifications = this.apiNotifications.slice(0, 8).map((item) => ({
        level: this.mapNotificationLevel(item.type),
        message: item.message || item.title || 'Notification',
        dateLabel: this.formatDate(item.createdAt)
      }));

      this.unreadNotifications = this.apiNotifications.filter((item) => !item.isRead).length;
      return;
    }

    this.notifications = this.buildNotifications();
    this.unreadNotifications = this.notifications.length;
  }

  markNotificationAsRead(notificationId: number): void {
    this.error = '';
    this.settingsSuccess = '';

    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        this.updateNotificationReadState(notificationId);
        this.settingsSuccess = 'Notification marked as read.';
        this.refreshNotifications();
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Unable to mark the notification as read.';
        this.cdr.markForCheck();
      }
    });
  }

  markAllNotificationsAsRead(): void {
    const userId = this.currentUserId ?? this.resolveCurrentUserId();
    if (!userId) {
      return;
    }

    this.error = '';
    this.settingsSuccess = '';

    this.notificationService.markAllAsRead(userId).subscribe({
      next: () => {
        this.apiNotifications = this.apiNotifications.map((item) => ({
          ...item,
          isRead: true
        }));
        this.syncNotificationsForView();
        this.settingsSuccess = 'All notifications have been marked as read.';
        this.refreshNotifications();
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Unable to mark all notifications as read.';
        this.cdr.markForCheck();
      }
    });
  }

  canReplyToNotification(item: Notification): boolean {
    return Number(item.relatedUserId ?? 0) > 0;
  }

  toggleReplyComposer(notificationId: number): void {
    this.error = '';
    this.settingsSuccess = '';
    this.showReplyComposerForNotificationId = this.showReplyComposerForNotificationId === notificationId ? null : notificationId;
    this.cdr.markForCheck();
  }

  sendReplyToNotification(item: Notification): void {
    const recipientUserId = Number(item.relatedUserId ?? 0);
    if (recipientUserId <= 0) {
      this.error = 'Unable to identify the reply recipient.';
      this.cdr.markForCheck();
      return;
    }

    const reply = (this.replyMessageByNotificationId[item.id] ?? '').trim();
    const attachmentDataUrl = (this.replyAttachmentDataUrlByNotificationId[item.id] ?? '').trim();
    const hasAttachment = attachmentDataUrl.length > 0;
    if (!reply && !hasAttachment) {
      this.error = 'Veuillez saisir votre reponse ou joindre un fichier.';
      this.cdr.markForCheck();
      return;
    }

    this.error = '';
    this.settingsSuccess = '';
    this.sendingReplyNotificationId = item.id;
    this.cdr.markForCheck();

    this.notificationService.sendDirectMessage({
      recipientUserId,
      taskId: item.relatedTaskId ?? null,
      title: `Reponse employe - ${item.title || 'Notification'}`,
      message: reply,
      attachmentName: hasAttachment ? this.replyAttachmentNameByNotificationId[item.id] : undefined,
      attachmentDataUrl: hasAttachment ? attachmentDataUrl : undefined,
    }).pipe(finalize(() => {
      this.sendingReplyNotificationId = null;
      this.cdr.markForCheck();
    })).subscribe({
      next: () => {
        this.settingsSuccess = 'Reply sent to the project manager.';
        this.replyMessageByNotificationId[item.id] = '';
        this.replyAttachmentNameByNotificationId[item.id] = '';
        this.replyAttachmentDataUrlByNotificationId[item.id] = '';
        this.showReplyComposerForNotificationId = null;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Unable to send the reply.';
        this.cdr.markForCheck();
      }
    });
  }

  onDelayAttachmentSelected(taskId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (!file) {
      this.taskDelayAttachmentNameByTaskId[taskId] = '';
      this.taskDelayAttachmentDataUrlByTaskId[taskId] = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.taskDelayAttachmentNameByTaskId[taskId] = file.name;
      this.taskDelayAttachmentDataUrlByTaskId[taskId] = typeof reader.result === 'string' ? reader.result : '';
      this.cdr.markForCheck();
    };
    reader.onerror = () => {
      this.error = 'Unable to read the attached file.';
      this.taskDelayAttachmentNameByTaskId[taskId] = '';
      this.taskDelayAttachmentDataUrlByTaskId[taskId] = '';
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  clearDelayAttachment(taskId: number): void {
    this.cdr.markForCheck();
    this.taskDelayAttachmentNameByTaskId[taskId] = '';
    this.taskDelayAttachmentDataUrlByTaskId[taskId] = '';
  }

  onReplyAttachmentSelected(notificationId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (!file) {
      this.replyAttachmentNameByNotificationId[notificationId] = '';
      this.replyAttachmentDataUrlByNotificationId[notificationId] = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.replyAttachmentNameByNotificationId[notificationId] = file.name;
      this.replyAttachmentDataUrlByNotificationId[notificationId] = typeof reader.result === 'string' ? reader.result : '';
      this.cdr.markForCheck();
    };
    reader.onerror = () => {
      this.error = 'Unable to read the attached file.';
      this.replyAttachmentNameByNotificationId[notificationId] = '';
      this.replyAttachmentDataUrlByNotificationId[notificationId] = '';
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  clearReplyAttachment(notificationId: number): void {
    this.replyAttachmentNameByNotificationId[notificationId] = '';
    this.replyAttachmentDataUrlByNotificationId[notificationId] = '';
    this.cdr.markForCheck();
  }

  mapNotificationLevel(type: string | undefined): 'warning' | 'info' | 'success' {
    const normalized = String(type ?? '').toLowerCase();
    if (normalized === 'success') return 'success';
    if (normalized === 'warning' || normalized === 'alert') return 'warning';
    return 'info';
  }

  private resolveCurrentUserId(): number | null {
    const userData = this.tokenService.getUserData();
    const parsed = Number(userData?.userId ?? userData?.id ?? 0);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    this.currentUserId = parsed;
    return parsed;
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
    if (value >= 4) return { label: 'Urgente', class: 'urgente' };
    if (value >= 3) return { label: 'Haute', class: 'haute' };
    if (value >= 2) return { label: 'Moyenne', class: 'moyenne' };
    return { label: 'Basse', class: 'basse' };
  }

  private buildDelayLabel(endDate: string | undefined): string {
    if (!endDate) return 'No deadline';
    const due = new Date(endDate);
    if (Number.isNaN(due.getTime())) return 'No deadline';
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)}d overdue`;
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

  private updateNotificationReadState(notificationId: number): void {
    this.apiNotifications = this.apiNotifications.map((item) =>
      item.id === notificationId ? { ...item, isRead: true } : item
    );
    this.syncNotificationsForView();
  }

  private getProjectStateLabel(state: ProjectState | undefined): string {
    if (state === ProjectState.done || state === ProjectState.validated) return 'Done';
    if (state === ProjectState.inProgress) return 'Active';
    if (state === ProjectState.todo) return 'On hold';
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

}