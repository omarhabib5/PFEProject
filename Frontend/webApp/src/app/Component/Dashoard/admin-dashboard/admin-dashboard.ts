import {Component,OnInit,AfterViewInit,OnDestroy,inject,ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
   import Chart from 'chart.js/auto';

import { TokenService } from '../../Auth/Service/token.service';
import { CreateEmployeeRequest, UpdateUserRequest, UserApiService, UserDto } from '../../Page/Team/Service/UserApiService';
import { ProjectService, project, State } from '../../Page/Projet/Service/ProjectService';
import { TaskService, TaskDto } from '../../Page/Task/Service/TaskService';
import { ServiceService, Service, CreateServiceDto, UpdateServiceDto } from '../../Page/Team/Service/ServiceService';
import { TeamService, Team, TeamUser, Role } from '../../Page/Team/Service/TeamService';
import { NotificationService } from '../../Page/Notification/Service/NotificationService';
import { Observable, Subscription, forkJoin, interval, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

type DashboardTab = 'dashboard' | 'services' | 'calendar' | 'users';

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
}

interface CalendarProjectEntry {
  id: number;
  name: string;
  serviceLabel: string;
  startLabel: string;
  endLabel: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit, AfterViewInit, OnDestroy {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private tokenService = inject(TokenService);
  private userApiService = inject(UserApiService);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private serviceService = inject(ServiceService);
  private teamService = inject(TeamService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

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

  searchTerm = '';
  selectedStatus = 'all';
  selectedServiceId: number | 'all' = 'all';
  loading = false;


  activeProjects = 0;
  completedProjects = 0;
  totalUsers = 0;
  completedTasks = 0;
  inProgressTasks = 0;
  urgentTasks = 0;
  unreadNotifications = 0;

  recentProjects: UiProjectCard[] = [];
  activeTeam: UserDto[] = [];

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
    { label: 'Employee', value: 3 }
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

  private tasksPieChart?: Chart;
  private priorityBarChart?: Chart;
  private autoRefreshSubscription: Subscription | null = null;
  private notificationCountSubscription: Subscription | null = null;
  private readonly autoRefreshMs = 15000;

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'services' || tabParam === 'dashboard' || tabParam === 'calendar' || tabParam === 'users') {
      this.activeTab = tabParam;
    }

    const userData = this.tokenService.getUserData();

    if (userData?.firstName && userData?.lastName) {
      this.userName = `${userData.firstName} ${userData.lastName}`;
    }

    if (userData?.role) {
      this.userRole = userData.role;
    }

    this.setCurrentDate();
    this.buildCalendar();
    this.loadProjects();
    this.loadTasks();
    this.loadUsers();
    this.loadServices();
    this.loadTeams();
    this.initializeNotifications();
    this.startAutoRefresh();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCharts();
    }, 500);
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.notificationCountSubscription?.unsubscribe();
    this.notificationCountSubscription = null;
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
    this.router.navigate(['/Services']);
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
        this.refreshCharts();
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
        this.activeTeam = data.slice(0, 3);
           this.cdr.detectChanges();
      },
      error: (err) => {
        this.serviceManagerUsers = [];
        console.error(err);
      }
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
      },
      error: (err) => console.error(err)
    });
  }


  filterProjects(): void {
    const term = this.searchTerm.trim().toLowerCase();

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

  private focusCalendarOnMatchedProjectStartMonth(term: string): boolean {
    if (!term) {
      return false;
    }

    const visibleProjects = this.filteredProjectCards
      .map((card) => this.projects.find((projectItem) => (projectItem.id ?? 0) === card.id))
      .filter((projectItem): projectItem is project => !!projectItem);

    const source = visibleProjects.length > 0 ? visibleProjects : this.projects;

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

  hasProjectOnDate(date: Date): boolean {
    const key = this.toDateKey(date);
    return (this.calendarProjectsByDate[key]?.length ?? 0) > 0;
  }

  getProjectsOnDate(date: Date): CalendarProjectEntry[] {
    return this.calendarProjectsByDate[this.toDateKey(date)] ?? [];
  }

  getUserInitials(user: UserDto): string {
    const first = (user.firstName || '').charAt(0);
    const last = (user.lastName || '').charAt(0);
    return `${first}${last}`.toUpperCase() || 'U';
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
            ? 'Access denied. Sign in again with an Admin or Service Manager account.'
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
    return 3;
  }

 

  initCharts(): void {
    if (this.activeTab !== 'dashboard') {
      return;
    }

    this.tasksPieChart?.destroy();
    this.priorityBarChart?.destroy();

    const statusCounts = this.getTaskStatusCounts();
    const priorityCounts = this.getTaskPriorityCounts();

    this.tasksPieChart = new Chart('tasksPieChart', {
      type: 'pie',
      data: {
        labels: ['In progress', 'In review', 'Done', 'To do'],
        datasets: [{
          data: [
            statusCounts.inProgress,
            statusCounts.validated,
            statusCounts.done,
            statusCounts.todo
          ],
          backgroundColor: [
            '#3b82f6',
            '#f59e0b',
            '#10b981',
            '#94a3b8'
          ]
        }]
      }
    });

    this.priorityBarChart = new Chart('priorityBarChart', {
      type: 'bar',
      data: {
        labels: ['Low', 'Medium', 'High', 'Urgent'],
        datasets: [{
          label: 'Tasks',
          data: [
            priorityCounts.low,
            priorityCounts.medium,
            priorityCounts.high,
            priorityCounts.urgent
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

    this.calendarTitle = new Date(year, month, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const startDate = new Date(year, month, 1 - startOffset);

    this.calendarCells = Array.from({ length: 35 }).map((_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return {
        date,
        inCurrentMonth: date.getMonth() === month
      };
    });

    this.updateCalendarProjectsMap();
  }

  private updateCalendarProjectsMap(): void {
    const map: Record<string, CalendarProjectEntry[]> = {};
    const projectsToRender = this.getCalendarSourceProjects();

    if (this.calendarCells.length === 0 || projectsToRender.length === 0) {
      this.calendarProjectsByDate = map;
      return;
    }

    const cellStart = new Date(this.calendarCells[0].date);
    const cellEnd = new Date(this.calendarCells[this.calendarCells.length - 1].date);

    for (const item of projectsToRender) {
      const projectStart = new Date(item.startDate);
      const projectEnd = new Date(item.endDate);

      if (Number.isNaN(projectStart.getTime()) || Number.isNaN(projectEnd.getTime())) {
        continue;
      }

      if (projectEnd < cellStart || projectStart > cellEnd) {
        continue;
      }

      const rangeStart = new Date(projectStart > cellStart ? projectStart : cellStart);
      const rangeEnd = new Date(projectEnd < cellEnd ? projectEnd : cellEnd);

      const entry: CalendarProjectEntry = {
        id: item.id ?? 0,
        name: item.name,
        serviceLabel: this.getCalendarServiceLabel(item.serviceId),
        startLabel: this.formatDate(item.startDate),
        endLabel: this.formatDate(item.endDate)
      };

      const cursor = new Date(rangeStart);
      while (cursor <= rangeEnd) {
        const key = this.toDateKey(cursor);
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push(entry);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    this.calendarProjectsByDate = map;
  }

  private getCalendarSourceProjects(): project[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return [];
    }

    return this.projects.filter((item) => (item.name ?? '').toLowerCase().includes(term));
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

  private getTaskStatusCounts(): { todo: number; inProgress: number; done: number; validated: number } {
    const counts = { todo: 0, inProgress: 0, done: 0, validated: 0 };

    this.tasks.forEach((task) => {
      const status = this.normalizeStatus(task.status);
      if (status === 'todo') counts.todo += 1;
      if (status === 'inProgress') counts.inProgress += 1;
      if (status === 'done') counts.done += 1;
      if (status === 'validated') counts.validated += 1;
    });

    return counts;
  }

  private getTaskPriorityCounts(): { low: number; medium: number; high: number; urgent: number } {
    const counts = { low: 0, medium: 0, high: 0, urgent: 0 };

    this.tasks.forEach((task) => {
      const complexity = Number(task.complexity ?? 0);
      if (complexity <= 1) counts.low += 1;
      else if (complexity <= 2) counts.medium += 1;
      else if (complexity <= 3) counts.high += 1;
      else counts.urgent += 1;
    });

    return counts;
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

    this.serviceFormLoading = true;
    const payload: CreateServiceDto = {
      name: this.newService.name.trim(),
      responsibleId: this.newService.responsibleId || undefined
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

    if (!this.editingServiceId) {
      return;
    }

    this.serviceFormLoading = true;
    const payload: UpdateServiceDto = {
      id: this.editService.id,
      name: this.editService.name.trim(),
      responsibleId: this.editService.responsibleId || undefined
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
        this.serviceFormError = err?.error?.message || 'Error while deleting service.';
        this.serviceFormLoading = false;
      }
    });
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshSubscription = interval(this.autoRefreshMs).subscribe(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      this.loadProjects();
      this.loadTasks();
      this.loadUsers();
      this.loadServices();
      this.loadTeams();
      this.refreshNotifications();
    });
  }

  private stopAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
    this.autoRefreshSubscription = null;
  }

  private initializeNotifications(): void {
    this.notificationCountSubscription?.unsubscribe();
    this.notificationCountSubscription = this.notificationService.unreadCount$.subscribe((count) => {
      this.unreadNotifications = count;
      this.cdr.markForCheck();
    });

    this.refreshNotifications();
  }

  private refreshNotifications(): void {
    const userId = this.resolveCurrentUserId();
    if (!userId) {
      this.unreadNotifications = 0;
      return;
    }

    this.notificationService.loadNotifications(userId);
  }

  private resolveCurrentUserId(): number | null {
    const userData = this.tokenService.getUserData();
    const parsed = Number(userData?.userId ?? userData?.id ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}