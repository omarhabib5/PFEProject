import {
  Component,
  OnInit,
  AfterViewInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute,Router } from '@angular/router';
import { Chart } from 'chart.js/auto';

import { TokenService } from '../../Auth/Service/token.service';
import { CreateEmployeeRequest, UpdateUserRequest, UserApiService, UserDto } from '../../Page/Team/Service/UserApiService';
import { ProjectService, project, State } from '../../Page/Projet/Service/ProjectService';
import { TaskService, TaskDto } from '../../Page/Task/Service/TaskService';

type DashboardTab = 'dashboard' | 'projects' | 'calendar' | 'users';

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

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit, AfterViewInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private tokenService = inject(TokenService);
  private userApiService = inject(UserApiService);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);

  userName = 'Administrateur';
  userRole = 'Admin';
  currentDate = '';
  activeTab: DashboardTab = 'dashboard';

  projects: project[] = [];
  filteredProjects: project[] = [];
  projectCards: UiProjectCard[] = [];
  filteredProjectCards: UiProjectCard[] = [];
  users: UserDto[] = [];
  tasks: TaskDto[] = [];

  searchTerm = '';
  selectedStatus = 'all';
  loading = false;

 
  activeProjects = 0;
  completedProjects = 0;
  totalUsers = 0;
  completedTasks = 0;
  inProgressTasks = 0;
  urgentTasks = 0;
  unreadNotifications = 3;

  recentProjects: UiProjectCard[] = [];
  activeTeam: UserDto[] = [];

  showAddUserForm = false;
  showEditUserForm = false;
  userFormLoading = false;
  userFormError = '';
  userFormSuccess = '';
  editingUserId: number | null = null;
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

  private tasksPieChart?: Chart;
  private priorityBarChart?: Chart;
  private projectProgressChart?: Chart;

  ngOnInit(): void {
       const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'dashboard' || tabParam === 'calendar' || tabParam === 'users' || tabParam === 'projects') {
      this.activeTab = tabParam as DashboardTab;
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
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCharts();
    }, 500);
  }



  setCurrentDate(): void {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    this.currentDate = new Date().toLocaleDateString('fr-FR', options);
  }

  setActiveTab(tab: DashboardTab): void {
    this.activeTab = tab;

    if (tab === 'dashboard') {
      setTimeout(() => this.initCharts(), 150);
      return;
    }

    if (tab === 'projects') {
      this.filterProjects();
    }

    if (tab === 'calendar') {
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
        this.refreshCharts();
        this.loading = false;
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
      },
      error: (err) => console.error(err)
    });
  }

  loadUsers(): void {
    this.userApiService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.totalUsers = data.length;
        this.activeTeam = data.slice(0, 3);
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

      return matchesTerm && matchesStatus;
    });
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
      ['Nom', 'Statut', 'Progression'],
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
    return this.projects.some((item) => {
      const start = this.toDateKey(new Date(item.startDate));
      const end = this.toDateKey(new Date(item.endDate));
      return key >= start && key <= end;
    });
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

  openKanbanBoard(): void {
    this.router.navigate(['/kanban']);
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
      this.userFormError = 'Nom, prénom et email sont obligatoires.';
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
        this.userFormSuccess = 'Utilisateur modifié avec succès.';
        this.userFormLoading = false;
        this.showEditUserForm = false;
        this.editingUserId = null;
        this.loadUsers();
      },
      error: (err) => {
        this.userFormError = err?.error?.message || 'Erreur lors de la modification de l\'utilisateur.';
        this.userFormLoading = false;
      }
    });
  }

  deleteUser(user: UserDto): void {
    if (!confirm(`Supprimer l'utilisateur ${user.firstName} ${user.lastName} ?`)) {
      return;
    }

    this.userFormError = '';
    this.userFormSuccess = '';
    this.userFormLoading = true;

    this.userApiService.deleteUser(user.id).subscribe({
      next: () => {
        this.userFormSuccess = 'Utilisateur supprimé avec succès.';
        this.userFormLoading = false;
        this.loadUsers();
      },
      error: (err) => {
        this.userFormError = err?.error?.message || 'Erreur lors de la suppression de l\'utilisateur.';
        this.userFormLoading = false;
      }
    });
  }

  createUser(): void {
    this.userFormError = '';
    this.userFormSuccess = '';

    if (!this.newUser.firstName.trim() || !this.newUser.lastName.trim() || !this.newUser.email.trim()) {
      this.userFormError = 'Nom, prénom et email sont obligatoires.';
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
        this.userFormSuccess = 'Utilisateur créé. Les identifiants ont été envoyés par email.';
        this.userFormLoading = false;
        this.showAddUserForm = false;
        this.resetUserForm();
        this.loadUsers();
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
            ? 'Accès refusé. Reconnectez-vous avec un compte Admin ou Service Manager.'
            : 'Erreur lors de la création de l\'utilisateur.');
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
    this.projectProgressChart?.destroy();

    const statusCounts = this.getTaskStatusCounts();
    const priorityCounts = this.getTaskPriorityCounts();
    const projectProgress = this.recentProjects.length
      ? this.recentProjects
      : this.projectCards.slice(0, 3);

    this.tasksPieChart = new Chart('tasksPieChart', {
      type: 'pie',
      data: {
        labels: ['En cours', 'En révision', 'Terminé', 'À faire'],
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
        labels: ['Basse', 'Moyenne', 'Haute', 'Urgente'],
        datasets: [{
          label: 'Tâches',
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

    this.projectProgressChart = new Chart('projectProgressChart', {
      type: 'bar',
      data: {
        labels: projectProgress.map((item) => item.name),
        datasets: [{
          label: 'Progression',
          data: projectProgress.map((item) => item.progress),
          borderRadius: 8,
          backgroundColor: '#10b981'
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        scales: {
          x: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25
            }
          }
        },
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
      [State.pending]: 'En attente',
      [State.todo]: 'À faire',
      [State.inProgress]: 'Actif',
      [State.done]: 'Terminé',
      [State.validated]: 'Validé'
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
      description: item.description || 'Aucune description',
      progress: progressMap[state] ?? 0,
      statusLabel: stateLabelMap[state] ?? 'Inconnu',
      statusClass: stateClassMap[state] ?? 'pending',
      dueDate: this.formatDate(item.endDate),
      membersLabel: item.team?.name ? `Équipe: ${item.team.name}` : 'Équipe non assignée',
      taskSummary: `${item.userStories?.length ?? 0} user stories`
    };
  }

  private formatDate(dateValue: Date | string): string {
    const date = new Date(dateValue);
    return date.toLocaleDateString('fr-FR');
  }

  private buildCalendar(): void {
    const year = this.currentMonthDate.getFullYear();
    const month = this.currentMonthDate.getMonth();

    this.calendarTitle = new Date(year, month, 1).toLocaleDateString('fr-FR', {
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
}
  