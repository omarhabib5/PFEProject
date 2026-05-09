import {Component,OnDestroy,OnInit,AfterViewInit,inject,ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
   import Chart from 'chart.js/auto';

import { TokenService } from '../../Auth/Service/token.service';
import { CreateEmployeeRequest, UpdateUserRequest, UserApiService, UserDto } from '../../Page/Team/Service/UserApiService';
import { ProjectService, project, State } from '../../Page/Projet/Service/ProjectService';
import { TaskService, TaskDto } from '../../Page/Task/Service/TaskService';
import { SprintService, Sprint, State as SprintState } from '../../Page/Sprint/Service/SprintService';
import { ServiceService, Service, CreateServiceDto, UpdateServiceDto } from '../../Page/Team/Service/ServiceService';
import { TeamService, Team, TeamUser, Role } from '../../Page/Team/Service/TeamService';
import { TeamManage } from '../../Page/Team/team-manage/team-manage';
import { UserStoryService } from '../../Page/UserStory/Service/UserStoryService';
import { UserStoryDto, UserStoryStatus } from '../../Page/UserStory/Models/userstory.model';
import { NotificationService } from '../../Page/Notifiation/Service/NotifcationService';
import type { Notification } from '../../Page/Notifiation/Models/Notification.Model';
import { Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

type DashboardTab = 'dashboard' | 'services' | 'calendar' | 'users' | 'teams';

interface UiProjectCard {
  id: number;
  name: string;
  description: string;
  progress: number;
  statusLabel: string;
  statusClass: string;
  dueDate: string;
  membersLabel: string;
  taskSummary: string;
}

interface CalendarCell {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
}

interface CalendarProjectEntry {
  id: number;
  kind: 'project' | 'task';
  name: string;
  projectLabel: string;
  serviceLabel: string;
  ownerLabel: string;
  statusLabel: string;
  startLabel: string;
  endLabel: string;
  endDateKey: string;
  rawStartDate: string | Date;
  rawEndDate: string | Date;
  description?: string;
}

interface DeadlineNotification {
  id: string;
  type: 'task' | 'sprint' | 'userStory';
  title: string;
  daysLeft: number;
  endDateLabel: string;
  message: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit, OnDestroy, AfterViewInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private tokenService = inject(TokenService);
  private userApiService = inject(UserApiService);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private sprintService = inject(SprintService);
  private userStoryService = inject(UserStoryService);
  private serviceService = inject(ServiceService);
  private teamService = inject(TeamService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  teamManageComponent = TeamManage;  

  userName = 'Administrator';
  userRole = 'Admin';
  currentDate = '';
  activeTab: DashboardTab = 'dashboard';

  projects: project[] = [];
  services: Service[] = [];
  teams: Team[] = [];
  filteredProjects: project[] = [];
  projectCards: UiProjectCard[] = [];
  filteredProjectCards: UiProjectCard[] = [];
  users: UserDto[] = [];
  serviceManagerUsers: UserDto[] = [];
  tasks: TaskDto[] = [];
  sprints: Sprint[] = [];
  userStories: UserStoryDto[] = [];
  notifications: Notification[] = [];
  deadlineNotifications: DeadlineNotification[] = [];
  showNotificationsPanel = false;
  private sentNotificationIds = new Set<string>();
  private currentUserId: number | null = null;

  searchTerm = '';
  selectedStatus = 'all';
  selectedServiceId: number | 'all' = 'all';
  loading = false;


  activeProjects = 0;
  completedProjects = 0;
  inProgressProjects = 0;
  delayedProjects = 0;
  totalUsers = 0;
  completedTasks = 0;
  inProgressTasks = 0;
  urgentTasks = 0;
  adminUnreadNotifications = 0;

  recentProjects: UiProjectCard[] = [];
  activeTeam: Team[] = [];

  showAddUserForm = false;
  showEditUserForm = false;
  userFormLoading = false;
  userFormError = '';
  userFormSuccess = '';
  editingUserId: number | null = null;

  showAddServiceForm = false;
  showEditServiceForm = false;
  serviceFormLoading = false;
  serviceFormError = '';
  serviceFormSuccess = '';
  editingServiceId: number | null = null;
  newService: CreateServiceDto = {
    name: '',
    responsibleId: undefined
  };
  editService: UpdateServiceDto = {
    id: 0,
    name: '',
    responsibleId: undefined
  };
  userRoleOptions = [
    { label: 'Admin', value: 0 },
    { label: 'Service Manager', value: 1 },
    { label: 'Project Manager', value: 2 },
    { label: 'Employee', value: 3 },
    { label: 'Observer', value: 4 }
  ];
  newUser: CreateEmployeeRequest = {
    firstName: '',
    lastName: '',
    email: '',
    role: 3,
    serviceId: null
  };

  editUser: UpdateUserRequest = {
    id: 0,
    firstName: '',
    lastName: '',
    email: '',
    role: 3
  };

  currentMonthDate = new Date();
  calendarTitle = '';
  calendarCells: CalendarCell[] = [];
  calendarProjectsByDate: Record<string, CalendarProjectEntry[]> = {};
  readonly calendarWeekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  selectedCalendarProjectId: number | 'all' = 'all';
  selectedCalendarServiceId: number | 'all' = 'all';
  selectedCalendarEmployeeId: number | 'all' = 'all';


private projectStatusPieChart?: Chart;
private projectProgressBarChart?: Chart;
private adminNotificationsSubscription: Subscription | null = null;


  private tasksPieChart?: Chart;
  private priorityBarChart?: Chart;




  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'services' || tabParam === 'dashboard' || tabParam === 'calendar' || tabParam === 'users' || tabParam === 'teams') {
      this.activeTab = tabParam;
    }

    const userData = this.tokenService.getUserData();

    if (userData?.firstName && userData?.lastName) {
      this.userName = `${userData.firstName} ${userData.lastName}`;
    }

    if (userData?.role) {
      this.userRole = userData.role;
    }

    const userId = Number(userData?.userId ?? userData?.id ?? 0);
    this.currentUserId = Number.isFinite(userId) && userId > 0 ? userId : null;

    this.setCurrentDate();
    this.buildCalendar();
    this.initializeNotifications();
    this.loadProjects();
    this.loadTasks();
    this.loadSprints();
    this.loadUserStories();
    this.loadUsers();
    this.loadServices();
    this.loadTeams();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCharts();
    }, 500);
  }

  ngOnDestroy(): void {
    this.adminNotificationsSubscription?.unsubscribe();
    this.adminNotificationsSubscription = null;
  }



  setCurrentDate(): void {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    this.currentDate = new Date().toLocaleDateString('en-US', options);
  }
  goToServiceManager(){
    this.router.navigate(['/Service']);
  }

  setActiveTab(tab: DashboardTab): void {
    this.activeTab = tab;

    if (tab === 'dashboard') {
      setTimeout(() => this.initCharts(), 150);
      return;
    }

    if (tab === 'services') {
      this.filterProjects();
    }

    if (tab === 'calendar') {
      this.focusCalendarOnMatchedProjectStartMonth(this.searchTerm.trim().toLowerCase());
      this.buildCalendar();
    }

    if (tab === 'users') {
      this.userFormError = '';
      this.userFormSuccess = '';
    }
  }


  loadProjects(): void {
    this.loading = true;

    this.projectService.getAllProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.filteredProjects = data;
        this.projectCards = data.map((item) => this.toUiProjectCard(item));
        this.filteredProjectCards = [...this.projectCards];
        this.activeProjects = data.length;
        this.completedProjects = data.filter((item) =>
          item.projectState === State.done || item.projectState === State.validated
        ).length;
        this.inProgressProjects = data.filter((item) => item.projectState === State.inProgress).length;
        this.delayedProjects = data.filter((item) => this.isProjectDelayed(item)).length;
        this.recentProjects = this.projectCards.slice(0, 3);

        this.filterProjects();
        this.updateCalendarProjectsMap();
        this.refreshCharts();
        this.loading = false;
         this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  loadTasks(): void {
    this.taskService.getAll().subscribe({
      next: (data) => {
        this.tasks = data;
        this.completedTasks = data.filter((task) => this.isTaskDone(task)).length;
        this.inProgressTasks = data.filter((task) => this.isTaskInProgress(task)).length;
        this.urgentTasks = data.filter((task) => this.isTaskUrgent(task)).length;
        this.updateDeadlineNotifications();
        this.refreshCharts();
         this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  loadSprints(): void {
    this.sprintService.getAllSprints().subscribe({
      next: (data) => {
        this.sprints = data;
        this.updateDeadlineNotifications();
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  loadUserStories(): void {
    this.userStoryService.getAllUserStories().subscribe({
      next: (data) => {
        this.userStories = data;
        this.updateDeadlineNotifications();
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  loadServices(): void {
    this.serviceService.getServices().subscribe({
      next: (data) => {
        this.services = data;
        this.updateCalendarProjectsMap();
         this.cdr.detectChanges();
      },
      error: (err) => console.error(err)

    });
  }

  loadUsers(): void {
    this.userApiService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.serviceManagerUsers = data.filter((user) => this.isServiceManagerRole(user.role));
        this.totalUsers = data.length;
           this.cdr.detectChanges();
      },
      error: (err) => {
        this.serviceManagerUsers = [];
        console.error(err);
      }
    });
  }

  private initializeNotifications(): void {
    const userId = this.currentUserId;
    if (!userId) {
      this.notifications = [];
      this.adminUnreadNotifications = 0;
      return;
    }

    this.adminNotificationsSubscription?.unsubscribe();
    this.adminNotificationsSubscription = this.notificationService.notifications$.subscribe({
      next: (items) => {
        this.notifications = (items ?? []).slice(0, 8);
        this.adminUnreadNotifications = (items ?? []).filter((item) => !item.isRead).length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notifications = [];
        this.adminUnreadNotifications = 0;
      }
    });

    this.refreshAdminNotifications();
  }

  private refreshAdminNotifications(): void {
    const userId = this.currentUserId;
    if (!userId) {
      this.notifications = [];
      this.adminUnreadNotifications = 0;
      return;
    }

    this.notificationService.loadNotifications(userId);
  }

  toggleAdminNotificationsPanel(): void {
    this.showNotificationsPanel = !this.showNotificationsPanel;
  }

  markAdminNotificationAsRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => this.refreshAdminNotifications(),
      error: () => console.error('Unable to mark admin notification as read')
    });
  }

  markAllAdminNotificationsAsRead(): void {
    const userId = this.currentUserId;
    if (!userId) {
      return;
    }

    this.notificationService.markAllAsRead(userId).subscribe({
      next: () => this.refreshAdminNotifications(),
      error: () => console.error('Unable to mark all admin notifications as read')
    });
  }

  private isServiceManagerRole(role: string | number | undefined): boolean {
    if (typeof role === 'number') {
      return role === 1;
    }

    const normalized = String(role ?? '').trim().toLowerCase();
    return normalized === '1'
      || normalized === 'servicemanager'
      || normalized === 'service manager'
      || normalized === 'service_manager';
  }

  loadTeams(): void {
    this.teamService.getTeams().subscribe({
      next: (data) => {
        this.teams = data;
        this.activeTeam = data.slice(0, 3);
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  getServiceNameById(serviceId?: number): string {
    const service = this.services.find((item) => Number(item.id) === Number(serviceId ?? -1));
    return service?.name ?? 'No service assigned';
  }

  getUserDisplayName(userId?: number | null): string {
    if (!userId) {
      return 'No employee assigned';
    }

    const user = this.users.find((item) => Number(item.id) === Number(userId));
    if (!user) {
      return `Employee #${userId}`;
    }

    return `${user.firstName} ${user.lastName}`.trim();
  }

  get calendarEmployeeOptions(): UserDto[] {
    return [...this.users]
      .filter((user) => this.roleLabelToValue(user.role) !== 0)
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }

  private getCalendarMode(): 'projects' | 'tasks' {
    return this.selectedCalendarEmployeeId === 'all' ? 'projects' : 'tasks';
  }


  filterProjects(): void {
    const term = this.activeTab === 'calendar'
      ? this.searchTerm.trim().toLowerCase()
      : '';

    this.filteredProjectCards = this.projectCards.filter((item) => {
      const matchesTerm = !term
        || item.name.toLowerCase().includes(term)
        || item.description.toLowerCase().includes(term);

      const matchesStatus = this.selectedStatus === 'all'
        || item.statusClass === this.selectedStatus;

      const project = this.projects.find((value) => (value.id ?? 0) === item.id);
      const matchesService = this.selectedServiceId === 'all'
        || Number(project?.serviceId ?? -1) === this.selectedServiceId;

      return matchesTerm && matchesStatus && matchesService;
    });

    const hasJumpedToMatchedMonth = this.focusCalendarOnMatchedProjectStartMonth(term);
    if (!hasJumpedToMatchedMonth) {
      this.updateCalendarProjectsMap();
    }
  }

  onCalendarFilterChange(): void {
    this.updateCalendarProjectsMap();
  }

  private focusCalendarOnMatchedProjectStartMonth(term: string): boolean {
    if (!term) {
      return false;
    }

    const mode = this.getCalendarMode();

    if (mode === 'tasks') {
      const source = this.getCalendarSourceTasks();
      const matchedTask = source.find((item) => (item.title ?? '').toLowerCase() === term)
        ?? source.find((item) => (item.title ?? '').toLowerCase().startsWith(term))
        ?? source.find((item) => (item.title ?? '').toLowerCase().includes(term))
        ?? source.find((item) => (item.assignedToName ?? '').toLowerCase().includes(term));

      if (!matchedTask) {
        return false;
      }

      const startDate = this.parseCalendarDate(matchedTask.startDate);
      if (!startDate) {
        return false;
      }

      const targetYear = startDate.getFullYear();
      const targetMonth = startDate.getMonth();
      const currentYear = this.currentMonthDate.getFullYear();
      const currentMonth = this.currentMonthDate.getMonth();

      if (targetYear === currentYear && targetMonth === currentMonth) {
        return false;
      }

      this.currentMonthDate = new Date(targetYear, targetMonth, 1);
      this.buildCalendar();
      return true;
    }

    const source = this.getCalendarSourceProjects();

    const matchedProject = source.find((item) => (item.name ?? '').toLowerCase() === term)
      ?? source.find((item) => (item.name ?? '').toLowerCase().startsWith(term))
      ?? source.find((item) => (item.name ?? '').toLowerCase().includes(term));
    if (!matchedProject) {
      return false;
    }

    const startDate = new Date(matchedProject.startDate);
    if (Number.isNaN(startDate.getTime())) {
      return false;
    }

    const targetYear = startDate.getFullYear();
    const targetMonth = startDate.getMonth();
    const currentYear = this.currentMonthDate.getFullYear();
    const currentMonth = this.currentMonthDate.getMonth();

    if (targetYear === currentYear && targetMonth === currentMonth) {
      return false;
    }

    this.currentMonthDate = new Date(targetYear, targetMonth, 1);
    this.buildCalendar();
    return true;
  }

  selectService(serviceId: number | 'all'): void {
    this.selectedServiceId = serviceId;
    this.filterProjects();
  }

  goToProjectsByService(serviceId: number | 'all'): void {
    const queryParams = serviceId === 'all' ? {} : { serviceId };
    this.router.navigate(['/ProjectManage'], { queryParams });
  }

  getServiceProjectCount(serviceId: number): number {
    return this.projects.filter((item) => Number(item.serviceId ?? -1) === serviceId).length;
  }

  logout(): void {
    this.tokenService.clear();
    this.router.navigate(['/']);
  }

  goToProjectManager(): void {
    this.router.navigate(['/ProjectManage']);
  }

  viewProject(id: number): void {
    this.router.navigate(['/ProjectView'], { queryParams: { id } });
  }

  exportProjects(): void {
    const rows = [
      ['Name', 'Status', 'Progress'],
      ...this.filteredProjectCards.map((item) => [
        item.name,
        item.statusLabel,
        `${item.progress}%`
      ])
    ];

    const csvContent = rows.map((row) => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'projects.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
  prevMonth(): void {
    this.currentMonthDate = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth() - 1,
      1
    );
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentMonthDate = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth() + 1,
      1
    );
    this.buildCalendar();
  }

  goToCurrentCalendarMonth(): void {
    const today = new Date();
    this.currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.buildCalendar();
  }

  hasProjectOnDate(date: Date): boolean {
    const key = this.toDateKey(date);
    return (this.calendarProjectsByDate[key]?.length ?? 0) > 0;
  }

  getProjectsOnDate(date: Date): CalendarProjectEntry[] {
    return this.calendarProjectsByDate[this.toDateKey(date)] ?? [];
  }

  hasProjectEndingOnDate(date: Date): boolean {
    const key = this.toDateKey(date);
    return this.getProjectsOnDate(date).some((item) => item.endDateKey === key);
  }

  isProjectEndDateOnCell(project: CalendarProjectEntry, date: Date): boolean {
    return project.endDateKey === this.toDateKey(date);
  }

  getUserInitials(user: UserDto): string {
    const first = (user.firstName || '').charAt(0);
    const last = (user.lastName || '').charAt(0);
    return `${first}${last}`.toUpperCase() || 'U';
  }

  toggleNotificationsPanel(): void {
    this.showNotificationsPanel = !this.showNotificationsPanel;
  }

  getRoleDisplay(role: string | number | undefined): string {
    const roleValue = this.roleLabelToValue(role);
    const roleOption = this.userRoleOptions.find((item) => item.value === roleValue);
    return roleOption?.label ?? 'Employee';
  }



  toggleAddUserForm(): void {
    this.showAddUserForm = !this.showAddUserForm;
    if (!this.showAddUserForm) {
      this.resetUserForm();
    }
    if (this.showAddUserForm) {
      this.showEditUserForm = false;
    }
  }

  startEditUser(user: UserDto): void {
    this.userFormError = '';
    this.userFormSuccess = '';
    this.showAddUserForm = false;
    this.showEditUserForm = true;
    this.editingUserId = user.id;

    this.editUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: this.roleLabelToValue(user.role)
    };
  }

  cancelEditUser(): void {
    this.showEditUserForm = false;
    this.editingUserId = null;
  }

  updateUser(): void {
    this.userFormError = '';
    this.userFormSuccess = '';

    if (!this.editUser.firstName.trim() || !this.editUser.lastName.trim() || !this.editUser.email.trim()) {
      this.userFormError = 'First name, last name, and email are required.';
      return;
    }

    this.userFormLoading = true;
    const payload: UpdateUserRequest = {
      id: this.editUser.id,
      firstName: this.editUser.firstName.trim(),
      lastName: this.editUser.lastName.trim(),
      email: this.editUser.email.trim(),
      role: Number(this.editUser.role)
    };

    this.userApiService.updateUser(payload).subscribe({
      next: () => {
        this.userFormSuccess = 'User updated successfully.';
        this.userFormLoading = false;
        this.showEditUserForm = false;
        this.editingUserId = null;
        this.loadUsers();
          this.cdr.detectChanges();
      },
      error: (err) => {
        this.userFormError = err?.error?.message || 'Error while updating user.';
        this.userFormLoading = false;
      }
    });
  }

  deleteUser(user: UserDto): void {
    if (!confirm(`Delete user ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    this.userFormError = '';
    this.userFormSuccess = '';
    this.userFormLoading = true;

    this.getUserDeleteBlockReasons(user).subscribe({
      next: (reasons) => {
        if (reasons.length > 0) {
          this.userFormError = `Deletion not allowed: this user is linked as ${reasons.join(', ')}.`;
          this.userFormLoading = false;
          this.cdr.detectChanges();
          return;
        }

        this.userApiService.deleteUser(user.id).subscribe({
          next: () => {
            this.userFormSuccess = 'User deleted successfully.';
            this.userFormLoading = false;
            this.loadUsers();
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.userFormError = err?.error?.message || 'Error while deleting user.';
            this.userFormLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.userFormError = 'Unable to verify user links. Please try again.';
        this.userFormLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private getUserDeleteBlockReasons(user: UserDto): Observable<string[]> {
    const reasons: string[] = [];

    const isProjectLeader = this.projects.some((item) => Number(item.projectManagerId) === user.id);
    if (isProjectLeader) {
      reasons.push('project manager');
    }

    const isServiceResponsible = this.services.some((item) => Number(item.responsibleId ?? -1) === user.id);
    if (isServiceResponsible) {
      reasons.push('service manager');
    }

    if (this.teams.length === 0) {
      return of(Array.from(new Set(reasons)));
    }

    const memberRequests = this.teams.map((team) =>
      this.teamService.getMembersByTeamId(team.id).pipe(
        map((members) => ({ team, members })),
        catchError(() => of({ team, members: [] as TeamUser[] }))
      )
    );

    return forkJoin(memberRequests).pipe(
      map((teamEntries) => {
        const isTeamMember = teamEntries.some((entry) =>
          entry.members.some((member) => Number(member.userId) === user.id || Number(member.user?.id ?? -1) === user.id)
        );

        const isTeamLeader = teamEntries.some((entry) =>
          entry.members.some(
            (member) =>
              (Number(member.userId) === user.id || Number(member.user?.id ?? -1) === user.id)
              && Number(member.role) === Role.ProjectLeader
          )
        );

        if (isTeamMember) {
          reasons.push('team member');
        }

        if (isTeamLeader) {
          reasons.push('team leader');
        }

        return Array.from(new Set(reasons));
      })
    );
  }

  createUser(): void {
    this.userFormError = '';
    this.userFormSuccess = '';

    if (!this.newUser.firstName.trim() || !this.newUser.lastName.trim() || !this.newUser.email.trim()) {
      this.userFormError = 'First name, last name, and email are required.';
      return;
    }

    this.userFormLoading = true;
    const payload: CreateEmployeeRequest = {
      firstName: this.newUser.firstName.trim(),
      lastName: this.newUser.lastName.trim(),
      email: this.newUser.email.trim(),
      role: Number(this.newUser.role),
      serviceId: null
    };

    this.userApiService.createEmployee(payload).subscribe({
      next: () => {
        this.userFormSuccess = 'User created. Credentials were sent by email.';
        this.userFormLoading = false;
        this.showAddUserForm = false;
        this.resetUserForm();
        this.loadUsers();
          this.cdr.detectChanges();
      },
      error: (err) => {
        const validationErrors = err?.error?.errors;
        const validationMessage = validationErrors
          ? Object.values(validationErrors).flat().join(' ')
          : null;

        this.userFormError = err?.error?.message
          || validationMessage
          || err?.error?.title
          || (err?.status === 401 || err?.status === 403
            ? 'Access denied. Sign in again with an Admin or Team Manager account.'
            : 'Error while creating user.');
        this.userFormLoading = false;
      }
    });
  }

  private resetUserForm(): void {
    this.newUser = {
      firstName: '',
      lastName: '',
      email: '',
      role: 3,
      serviceId: null
    };
  }

  private roleLabelToValue(role?: string | number): number {
    if (typeof role === 'number') {
      return role;
    }

    if (typeof role === 'string' && role.trim() !== '' && !Number.isNaN(Number(role))) {
      return Number(role);
    }

    const normalized = (role || '').toLowerCase();
    if (normalized === 'admin') return 0;
    if (normalized === 'servicemanager' || normalized === 'service manager') return 1;
    if (normalized === 'projectmanager' || normalized === 'project manager') return 2;
    if (normalized === 'observer' || normalized === 'observateur') return 4;
    return 3;
  }

 

  initCharts(): void {
    if (this.activeTab !== 'dashboard') {
      return;
    }

    this.projectStatusPieChart?.destroy();
    this.projectProgressBarChart?.destroy();

    const statusCounts = this.getProjectStatusCounts();
    const progressCounts = this.getProjectProgressCounts();

    this.projectStatusPieChart = new Chart('projectStatusPieChart', {
      type: 'pie',
      data: {
        labels: ['In Progress', 'Validated', 'Done', 'To Do', 'Pending'],
        datasets: [{
          data: [
            statusCounts.inProgress,
            statusCounts.validated,
            statusCounts.done,
            statusCounts.todo,
            statusCounts.pending
          ],
          backgroundColor: [
            '#3b82f6',
            '#f59e0b',
            '#10b981',
            '#94a3b8',
            '#64748b'
          ]
        }]
      }
    });

    this.projectProgressBarChart = new Chart('projectProgressBarChart', {
      type: 'bar',
      data: {
        labels: ['0-25%', '26-50%', '51-75%', '76-100%'],
        datasets: [{
          label: 'Projects',
          data: [
            progressCounts.veryLow,
            progressCounts.low,
            progressCounts.medium,
            progressCounts.high
          ],
          backgroundColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  private refreshCharts(): void {
    if (this.activeTab === 'dashboard') {
      setTimeout(() => this.initCharts(), 120);
    }
  }

  private toUiProjectCard(item: project): UiProjectCard {
    const state = Number(item.projectState);
    const progressMap: Record<number, number> = {
      [State.pending]: 10,
      [State.todo]: 30,
      [State.inProgress]: 60,
      [State.done]: 100,
      [State.validated]: 100
    };

    const stateLabelMap: Record<number, string> = {
      [State.pending]: 'Pending',
      [State.todo]: 'To do',
      [State.inProgress]: 'Active',
      [State.done]: 'Done',
      [State.validated]: 'Validated'
    };

    const stateClassMap: Record<number, string> = {
      [State.pending]: 'pending',
      [State.todo]: 'todo',
      [State.inProgress]: 'active',
      [State.done]: 'done',
      [State.validated]: 'done'
    };

    return {
      id: item.id ?? 0,
      name: item.name,
      description: item.description || 'No description',
      progress: progressMap[state] ?? 0,
      statusLabel: stateLabelMap[state] ?? 'Unknown',
      statusClass: stateClassMap[state] ?? 'pending',
      dueDate: this.formatDate(item.endDate),
      membersLabel: item.team?.name ? `Team: ${item.team.name}` : 'Team not assigned',
      taskSummary: `${item.userStories?.length ?? 0} user stories`
    };
  }

  private formatDate(dateValue: Date | string): string {
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-US');
  }

  private buildCalendar(): void {
    const year = this.currentMonthDate.getFullYear();
    const month = this.currentMonthDate.getMonth();
    const todayKey = this.toDateKey(new Date());

    this.calendarTitle = new Date(year, month, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startOffset);

    this.calendarCells = Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return {
        date,
        inCurrentMonth: date.getMonth() === month,
        isToday: this.toDateKey(date) === todayKey
      };
    });

    this.updateCalendarProjectsMap();
  }

  private updateCalendarProjectsMap(): void {
    const map: Record<string, CalendarProjectEntry[]> = {};
    const timelineEntries = this.getCalendarMode() === 'tasks'
      ? this.getCalendarSourceTasks().map((item) => this.toCalendarTaskEntry(item))
      : this.getCalendarSourceProjects().map((item) => this.toCalendarProjectEntry(item));

    if (this.calendarCells.length === 0 || timelineEntries.length === 0) {
      this.calendarProjectsByDate = map;
      return;
    }

    const cellStart = new Date(this.calendarCells[0].date);
    const cellEnd = new Date(this.calendarCells[this.calendarCells.length - 1].date);

    for (const item of timelineEntries) {
      const projectStart = this.parseCalendarDate(item.rawStartDate);
      const projectEnd = this.parseCalendarDate(item.rawEndDate);

      if (!projectStart || !projectEnd) {
        continue;
      }

      if (projectEnd < cellStart || projectStart > cellEnd) {
        continue;
      }

      const rangeStart = new Date(projectStart > cellStart ? projectStart : cellStart);
      const rangeEnd = new Date(projectEnd < cellEnd ? projectEnd : cellEnd);

      const cursor = new Date(rangeStart);
      while (cursor <= rangeEnd) {
        const key = this.toDateKey(cursor);
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push(item);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    this.calendarProjectsByDate = map;
  }

  private getCalendarSourceProjects(): project[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.projects.filter((item) => {
      const matchesTerm = !term
        || (item.name ?? '').toLowerCase().includes(term)
        || this.getCalendarServiceLabel(item.serviceId).toLowerCase().includes(term)
        || this.getUserDisplayName(item.projectManagerId).toLowerCase().includes(term);

      const matchesProject = this.selectedCalendarProjectId === 'all'
        || Number(item.id ?? -1) === this.selectedCalendarProjectId;

      const matchesService = this.selectedCalendarServiceId === 'all'
        || Number(item.serviceId ?? -1) === this.selectedCalendarServiceId;

      const matchesEmployee = this.selectedCalendarEmployeeId === 'all'
        || Number(item.projectManagerId ?? -1) === this.selectedCalendarEmployeeId;

      return matchesTerm && matchesProject && matchesService && matchesEmployee;
    });
  }

  private getCalendarSourceTasks(): TaskDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.tasks.filter((task) => {
      const taskProject = this.getTaskProject(task);
      const taskProjectId = Number(taskProject?.id ?? -1);
      const matchesProject = this.selectedCalendarProjectId === 'all'
        || taskProjectId === this.selectedCalendarProjectId;

      const matchesService = this.selectedCalendarServiceId === 'all'
        || Number(taskProject?.serviceId ?? -1) === this.selectedCalendarServiceId;

      const matchesEmployee = this.selectedCalendarEmployeeId === 'all'
        || Number(task.assignedToId ?? -1) === this.selectedCalendarEmployeeId;

      const searchOwner = (task.assignedToName ?? this.getUserDisplayName(task.assignedToId)).toLowerCase();
      const searchProject = (taskProject?.name ?? '').toLowerCase();
      const searchService = this.getCalendarServiceLabel(taskProject?.serviceId).toLowerCase();
      const searchText = [task.title, task.description, searchOwner, searchProject, searchService].join(' ').toLowerCase();
      const matchesTerm = !term || searchText.includes(term);

      return matchesTerm && matchesProject && matchesService && matchesEmployee;
    });
  }

  private toCalendarProjectEntry(item: project): CalendarProjectEntry {
    const projectEnd = this.parseCalendarDate(item.endDate) ?? new Date(item.endDate);
    return {
      id: item.id ?? 0,
      kind: 'project',
      name: item.name,
      projectLabel: item.name,
      serviceLabel: this.getCalendarServiceLabel(item.serviceId),
      ownerLabel: this.getUserDisplayName(item.projectManagerId),
      statusLabel: this.getProjectStateLabel(item.projectState),
      startLabel: this.formatDate(item.startDate),
      endLabel: this.formatDate(item.endDate),
      endDateKey: this.toDateKey(projectEnd),
      rawStartDate: item.startDate,
      rawEndDate: item.endDate,
      description: item.description || 'Project timeline'
    };
  }

  private toCalendarTaskEntry(task: TaskDto): CalendarProjectEntry {
    const taskProject = this.getTaskProject(task);
    const taskEnd = this.parseCalendarDate(task.endDate) ?? new Date(task.endDate ?? task.startDate ?? new Date());
    return {
      id: task.id,
      kind: 'task',
      name: task.title,
      projectLabel: taskProject?.name ?? 'No project assigned',
      serviceLabel: this.getCalendarServiceLabel(taskProject?.serviceId),
      ownerLabel: task.assignedToName ?? this.getUserDisplayName(task.assignedToId),
      statusLabel: this.getTaskStateLabel(task.status),
      startLabel: this.formatDate(task.startDate ?? task.endDate ?? new Date()),
      endLabel: this.formatDate(task.endDate ?? task.startDate ?? new Date()),
      endDateKey: this.toDateKey(taskEnd),
      rawStartDate: task.startDate ?? task.endDate ?? new Date(),
      rawEndDate: task.endDate ?? task.startDate ?? new Date(),
      description: task.description || 'Task'
    };
  }

  private getTaskProject(task: TaskDto): project | undefined {
    const userStoryId = Number(task.userStoryId ?? 0);
    return this.projects.find((projectItem) =>
      projectItem.userStories?.some((story) => Number(story.id) === userStoryId)
    );
  }

  private parseCalendarDate(value: string | Date | undefined | null): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getTaskStateLabel(status: TaskDto['status']): string {
    const normalized = typeof status === 'number' ? status : String(status ?? '').toLowerCase();
    if (normalized === 0 || normalized === 'pending') return 'Pending';
    if (normalized === 1 || normalized === 'todo') return 'To do';
    if (normalized === 2 || normalized === 'inprogress') return 'In progress';
    if (normalized === 3 || normalized === 'done') return 'Done';
    if (normalized === 4 || normalized === 'validated') return 'Validated';
    return 'Task';
  }

  private getProjectStateLabel(state: project['projectState']): string {
    const normalized = Number(state);
    if (normalized === State.pending) return 'Pending';
    if (normalized === State.todo) return 'To do';
    if (normalized === State.inProgress) return 'In progress';
    if (normalized === State.done) return 'Done';
    if (normalized === State.validated) return 'Validated';
    return 'Project';
  }

  private getCalendarServiceLabel(serviceId?: number): string {
    if (!serviceId) {
      return 'No service';
    }

    const service = this.services.find((item) => item.id === serviceId);
    return service?.name ?? `Service #${serviceId}`;
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getProjectStatusCounts(): { pending: number; todo: number; inProgress: number; done: number; validated: number } {
    const counts = { pending: 0, todo: 0, inProgress: 0, done: 0, validated: 0 };

    this.projects.forEach((item) => {
      const state = Number(item.projectState);
      if (state === State.pending) counts.pending += 1;
      else if (state === State.todo) counts.todo += 1;
      else if (state === State.inProgress) counts.inProgress += 1;
      else if (state === State.done) counts.done += 1;
      else if (state === State.validated) counts.validated += 1;
    });

    return counts;
  }

  private getProjectProgressCounts(): { veryLow: number; low: number; medium: number; high: number } {
    const counts = { veryLow: 0, low: 0, medium: 0, high: 0 };

    this.projectCards.forEach((item) => {
      if (item.progress <= 25) counts.veryLow += 1;
      else if (item.progress <= 50) counts.low += 1;
      else if (item.progress <= 75) counts.medium += 1;
      else counts.high += 1;
    });

    return counts;
  }

  private isProjectDelayed(item: project): boolean {
    const state = Number(item.projectState);
    if (state === State.done || state === State.validated) {
      return false;
    }

    if (!item.endDate) {
      return false;
    }

    return new Date(item.endDate).getTime() < Date.now();
  }

  private normalizeStatus(status: TaskDto['status']): 'pending' | 'todo' | 'inProgress' | 'done' | 'validated' {
    if (typeof status === 'string') {
      if (status === 'pending' || status === 'todo' || status === 'inProgress' || status === 'done' || status === 'validated') {
        return status;
      }
      return 'pending';
    }

    const map: Record<number, 'pending' | 'todo' | 'inProgress' | 'done' | 'validated'> = {
      0: 'pending',
      1: 'todo',
      2: 'inProgress',
      3: 'done',
      4: 'validated'
    };
    return map[Number(status)] ?? 'pending';
  }

  private isTaskDone(task: TaskDto): boolean {
    const status = this.normalizeStatus(task.status);
    return status === 'done' || status === 'validated';
  }

  private isTaskInProgress(task: TaskDto): boolean {
    return this.normalizeStatus(task.status) === 'inProgress';
  }

  private isTaskUrgent(task: TaskDto): boolean {
    if ((task.complexity ?? 0) >= 4) {
      return true;
    }

    const status = this.normalizeStatus(task.status);
    if (status === 'done' || status === 'validated') {
      return false;
    }

    if (!task.endDate) {
      return false;
    }

    const diff = new Date(task.endDate).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 3;
  }

  private updateDeadlineNotifications(): void {
    const notifications: DeadlineNotification[] = [
      ...this.buildTaskDeadlineNotifications(),
      ...this.buildSprintDeadlineNotifications(),
   
    ].sort((a, b) => a.daysLeft - b.daysLeft || a.title.localeCompare(b.title));

    this.deadlineNotifications = notifications;
    this.sendBrowserDeadlineNotifications(notifications);
  }

  private buildTaskDeadlineNotifications(): DeadlineNotification[] {
    return this.tasks
      .filter((task) => {
        if (!task.endDate || this.isTaskDone(task)) {
          return false;
        }

        const daysLeft = this.getDaysLeft(task.endDate);
        return daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
      })
      .map((task) => {
        const daysLeft = this.getDaysLeft(task.endDate!) ?? 0;
        const endDateLabel = this.formatDate(task.endDate!);

        return {
          id: `task-${task.id}`,
          type: 'task' as const,
          title: task.title,
          daysLeft,
          endDateLabel,
          message: `Task "${task.title}" ends in ${daysLeft} day(s) (${endDateLabel}).`
        };
      });
  }

  private buildSprintDeadlineNotifications(): DeadlineNotification[] {
    return this.sprints
      .filter((sprint) => {
        if (this.isSprintDone(sprint)) {
          return false;
        }

        const daysLeft = this.getDaysLeft(sprint.endDate);
        return daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
      })
      .map((sprint) => {
        const daysLeft = this.getDaysLeft(sprint.endDate) ?? 0;
        const endDateLabel = this.formatDate(sprint.endDate);

        return {
          id: `sprint-${sprint.id}`,
          type: 'sprint' as const,
          title: sprint.name,
          daysLeft,
          endDateLabel,
          message: `Sprint "${sprint.name}" ends in ${daysLeft} day(s) (${endDateLabel}).`
        };
      });
  }


  

  private getDaysLeft(dateValue: Date | string): number | null {
    const target = new Date(dateValue);
    if (Number.isNaN(target.getTime())) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  private isSprintDone(sprint: Sprint): boolean {
    return sprint.sprintState === SprintState.done || sprint.sprintState === SprintState.validated;
  }

  private isUserStoryDone(story: UserStoryDto): boolean {
    if (story.status === UserStoryStatus.DONE) {
      return true;
    }

    if (story.userStoryState === undefined || story.userStoryState === null) {
      return false;
    }

    return Number(story.userStoryState) === 3 || Number(story.userStoryState) === 4;
  }

  private sendBrowserDeadlineNotifications(notifications: DeadlineNotification[]): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    for (const item of notifications) {
      if (this.sentNotificationIds.has(item.id)) {
        continue;
      }

      this.sentNotificationIds.add(item.id);
      new Notification('Deadline Alert', { body: item.message });
    }
  }

  /* ===== SERVICE FORM METHODS ===== */

  toggleAddServiceForm(): void {
    this.showAddServiceForm = !this.showAddServiceForm;
    if (!this.showAddServiceForm) {
      this.resetServiceForm();
    }
    if (this.showAddServiceForm) {
      this.showEditServiceForm = false;
    }
  }

  createService(): void {
    this.serviceFormError = '';
    this.serviceFormSuccess = '';

    if (!this.newService.name.trim()) {
      this.serviceFormError = 'Service name is required.';
      return;
    }

    const newName = this.newService.name.trim();
    const duplicate = this.services.some((s) => (s.name ?? '').trim().toLowerCase() === newName.toLowerCase());
    if (duplicate) {
      this.serviceFormError = 'A service with this name already exists.';
      return;
    }

    this.serviceFormLoading = true;
    const payload: CreateServiceDto = {
      name: this.newService.name.trim(),
      responsibleId: this.normalizeResponsibleId(this.newService.responsibleId)
    };

    this.serviceService.createService(payload).subscribe({
      next: () => {
        this.serviceFormSuccess = 'Service created successfully.';
        this.serviceFormLoading = false;
        this.showAddServiceForm = false;
        this.resetServiceForm();
        this.loadServices();
        this.cdr.detectChanges();
                setTimeout(() => this.serviceFormSuccess = '', 3000);
      },
      error: (err) => {
        this.serviceFormError = err?.error?.message || 'Error while creating service.';
        this.serviceFormLoading = false;
      }
    });
  }

  private resetServiceForm(): void {
    this.newService = {
      name: '',
      responsibleId: undefined
    };
  }

  startEditService(service: Service): void {
    this.serviceFormError = '';
    this.serviceFormSuccess = '';
    this.showAddServiceForm = false;
    this.showEditServiceForm = true;
    this.editingServiceId = service.id;

    this.editService = {
      id: service.id,
      name: service.name,
      responsibleId: service.responsibleId
    };
  }

  cancelEditService(): void {
    this.showEditServiceForm = false;
    this.editingServiceId = null;
    this.serviceFormError = '';
  }

  updateService(): void {
    this.serviceFormError = '';
    this.serviceFormSuccess = '';

    if (!this.editService.name.trim()) {
      this.serviceFormError = 'Service name is required.';
      return;
    }

    if (this.editingServiceId == null) {
      return;
    }

    const updatedName = this.editService.name.trim();
    const duplicateUpdate = this.services.some((s) => Number(s.id) !== Number(this.editingServiceId) && (s.name ?? '').trim().toLowerCase() === updatedName.toLowerCase());
    if (duplicateUpdate) {
      this.serviceFormError = 'A service with this name already exists.';
      return;
    }

    this.serviceFormLoading = true;
    const payload: UpdateServiceDto = {
      id: this.editingServiceId,
      name: this.editService.name.trim(),
      responsibleId: this.normalizeResponsibleId(this.editService.responsibleId)
    };

    this.serviceService.updateService(this.editingServiceId, payload).subscribe({
      next: () => {
        this.serviceFormSuccess = 'Service updated successfully.';
        this.serviceFormLoading = false;
        this.showEditServiceForm = false;
        this.editingServiceId = null;
        this.loadServices();
        this.cdr.detectChanges();
        setTimeout(() => this.serviceFormSuccess = '', 3000);
      },
      error: (err) => {
        this.serviceFormError = err?.error?.message || 'Error while updating service.';
        this.serviceFormLoading = false;
      }
    });
  }

  deleteService(service: Service): void {
    const deleteBlockReason = this.getServiceDeleteBlockReason(service);
    if (deleteBlockReason) {
      alert(deleteBlockReason);
      return;
    }

    if (!confirm(`Delete service "${service.name}"? This action cannot be undone.`)) {
      return;
    }

    this.serviceFormError = '';
    this.serviceFormSuccess = '';
    this.serviceFormLoading = true;

    this.serviceService.deleteService(service.id).subscribe({
      next: () => {
        this.serviceFormSuccess = 'Service deleted successfully.';
        this.serviceFormLoading = false;
        this.loadServices();
       
        setTimeout(() => this.serviceFormSuccess = '', 3000);
         this.cdr.detectChanges();
      },
      error: (err) => {
        const backendMessage = err?.error?.message;

        if (backendMessage && typeof backendMessage === 'string') {
          this.serviceFormError = backendMessage;
          alert(`Service cannot be deleted: ${backendMessage}`);
        } else if (err?.status === 404) {
          this.serviceFormError = 'Service not found or cannot be deleted due to linked data.';
          alert('Service cannot be deleted. It may already be removed, or it is still linked to projects/users.');
        } else {
          this.serviceFormError = 'Error while deleting service.';
          alert('Service cannot be deleted because of a server error. Please try again.');
        }

        this.serviceFormLoading = false;
      }
    });
  }

  private normalizeResponsibleId(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '' || value === 'undefined' || value === 'null') {
      return undefined;
    }

    const parsedValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return undefined;
    }

    return parsedValue;
  }

  private getServiceDeleteBlockReason(service: Service): string | null {
    const existingService = this.services.find((item) => Number(item.id) === Number(service.id));
    if (!existingService) {
      return 'This service is not in the current list anymore. Please refresh and try again.';
    }

    const linkedProjectsCount = this.projects.filter((item) => Number(item.serviceId ?? -1) === Number(service.id)).length;
    if (linkedProjectsCount > 0) {
      return `Cannot delete service "${service.name}" because it is linked to ${linkedProjectsCount} project(s). Reassign or delete those projects first.`;
    }

    if (existingService.responsibleId && Number(existingService.responsibleId) > 0) {
      const responsible = this.users.find((user) => user.id === Number(existingService.responsibleId));
      const responsibleLabel = responsible
        ? `${responsible.firstName} ${responsible.lastName}`
        : `user #${existingService.responsibleId}`;

      return `Cannot delete service "${service.name}" because it still has a responsible manager (${responsibleLabel}). Remove or change the responsible manager first.`;
    }

    return null;
  }
}