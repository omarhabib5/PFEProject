import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { TokenService } from '../../Auth/Service/token.service';
import { ProjectService, State as ProjectState, project as ProjectEntity } from '../../Page/Projet/Service/ProjectService';
import { Sprint as SprintEntity, SprintService } from '../../Page/Sprint/Service/SprintService';
import { TaskDto, TaskService } from '../../Page/Task/Service/TaskService';
import { UserStoryService } from '../../Page/UserStory/Service/UserStoryService';
import { UserStoryDto, UserStoryStatus } from '../../Page/UserStory/Models/userstory.model';

type SidebarSection = 'dashboard' | 'calendar' | 'notifications';
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
export class EmployeeDashboard implements OnInit {
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private taskService = inject(TaskService);
  private projectService = inject(ProjectService);
  private sprintService = inject(SprintService);
  private userStoryService = inject(UserStoryService);

  sidebarSection: SidebarSection = 'dashboard';
  activeTab: EmployeeTab = 'overview';

  loading = false;
  error = '';
  searchTerm = '';

  userName = 'Employé';
  roleLabel = 'Membre';
  serviceLabel = 'Service';
  todayLabel = '';
  unreadNotifications = 0;

  currentUserId: number | null = null;

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

  readonly weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  readonly bucketOrder: TaskBucket[] = ['todo', 'inProgress', 'review', 'done'];
  readonly bucketLabels: Record<TaskBucket, string> = {
    todo: 'À faire',
    inProgress: 'En cours',
    review: 'En révision',
    done: 'Terminé'
  };

  ngOnInit(): void {
    if (!this.tokenService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.hydrateProfile();
    this.todayLabel = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    this.loadEmployeeData();
  }

  get pageTitle(): string {
    if (this.sidebarSection === 'calendar') return 'Calendrier';
    if (this.sidebarSection === 'notifications') return 'Notifications';
    return 'Mon Tableau de bord';
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
    return this.myTasks.filter((task) => task.priorityClass === 'urgent' || task.priorityClass === 'high').length;
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
    return this.currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
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
          this.error = 'Impossible de mettre à jour le statut de la tâche.';
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

    const idRaw = data?.userId ?? data?.id;
    const parsed = Number(idRaw);
    this.currentUserId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private loadEmployeeData(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      tasks: this.taskService.getAll().pipe(catchError(() => of([] as TaskDto[]))),
      projects: this.projectService.getAllProjects().pipe(catchError(() => of([] as ProjectEntity[])))
    })
      .pipe(timeout(15000))
      .subscribe({
        next: ({ tasks, projects }) => {
          const projectIds = projects
            .map((p) => p.id)
            .filter((id): id is number => typeof id === 'number' && id > 0);

          const sprintRequests = projectIds.map((projectId) =>
            this.sprintService.getSprintsByProjectId(projectId).pipe(catchError(() => of([] as SprintEntity[])))
          );

          if (sprintRequests.length === 0) {
            this.composeDashboard(tasks, projects, [], []);
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
                  this.composeDashboard(tasks, projects, sprints, []);
                  return;
                }

                const storyRequests = sprintIds.map((sprintId) =>
                  this.userStoryService.getBySprintId(sprintId).pipe(catchError(() => of([] as UserStoryDto[])))
                );

                forkJoin(storyRequests).subscribe({
                  next: (storiesBySprint) => {
                    this.composeDashboard(tasks, projects, sprints, storiesBySprint.flat());
                  },
                  error: () => {
                    this.composeDashboard(tasks, projects, sprints, []);
                  }
                });
              },
              error: () => {
                this.composeDashboard(tasks, projects, [], []);
              }
            });
        },
        error: () => {
          this.loading = false;
          this.error = 'Impossible de charger les données employé.';
        }
      });
  }

  private composeDashboard(
    tasks: TaskDto[],
    projects: ProjectEntity[],
    sprints: SprintEntity[],
    stories: UserStoryDto[]
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
      if (typeof story.id === 'number') {
        storyById.set(story.id, story);
      }
    });

    const projectById = new Map<number, ProjectEntity>();
    projects.forEach((project) => {
      if (typeof project.id === 'number') {
        projectById.set(project.id, project);
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
        const sprint = story?.sprintId ? sprintById.get(story.sprintId) : null;
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

      const manager = (project?.projectManager as any) ? `${(project?.projectManager as any).firstName ?? ''} ${(project?.projectManager as any).lastName ?? ''}`.trim() : 'Non assigné';
      const dueDate = this.toFrDate((project as any)?.endDate);

      return {
        id: projectId,
        name: project?.name ?? `Projet ${projectId}`,
        description: project?.description ?? 'Aucune description',
        managerName: manager || 'Non assigné',
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
        const sprintStories = stories.filter((story) => story.sprintId === sprint.id);
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
    const sprint = (task.sprintId ? sprintById.get(task.sprintId) : null) ?? (story?.sprintId ? sprintById.get(story.sprintId) : null);
    const project = sprint ? projectById.get(Number((sprint as any).projectId ?? 0)) : null;
    const bucket = this.mapBucket(task.status);
    const priority = this.mapPriority(task.complexity);

    return {
      id: task.id,
      title: task.title,
      projectName: project?.name ?? 'Projet non assigné',
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
    const sprint = (task.sprintId ? sprintById.get(task.sprintId) : null) ?? (story?.sprintId ? sprintById.get(story.sprintId) : null);
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

    const sprintStories = stories.filter((story) => story.sprintId === active.id);
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
      if (task.priorityClass === 'urgent' || task.priorityClass === 'high') {
        notifications.push({
          level: 'warning',
          message: `Priorité ${task.priorityLabel} : ${task.title}`,
          dateLabel: this.todayLabel
        });
      }
      if (task.delayLabel.startsWith('Retard')) {
        notifications.push({
          level: 'info',
          message: `${task.title} est en ${task.delayLabel.toLowerCase()}`,
          dateLabel: this.todayLabel
        });
      }
    });

    if (this.doneCount > 0) {
      notifications.push({
        level: 'success',
        message: `${this.doneCount} tâche(s) terminée(s)` ,
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

  private taskDueDate(taskId: number): Date | null {
    const raw = this.allTasks.find((task) => task.id === taskId)?.endDate;
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private sameDate(a: Date, b: Date | null): boolean {
    if (!b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private isMine(task: TaskDto): boolean {
    if (this.currentUserId && typeof task.assignedToId === 'number') {
      return task.assignedToId === this.currentUserId;
    }

    const fullName = this.userName.trim().toLowerCase();
    return (task.assignedToName ?? '').toLowerCase().includes(fullName) || fullName === '';
  }

  private mapBucket(status: TaskDto['status']): TaskBucket {
    const normalized = typeof status === 'string' ? status.toLowerCase() : Number(status);

    if (normalized === 'inprogress' || normalized === 'inprogress' || normalized === 2) return 'inProgress';
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
    if (!endDate) return 'Sans échéance';
    const due = new Date(endDate);
    if (Number.isNaN(due.getTime())) return 'Sans échéance';
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days < 0) return `Retard ${Math.abs(days)}j`;
    return `Dans ${days}j`;
  }

  private nextStatus(status: TaskDto['status']): UserStoryStatus | null {
    const bucket = this.mapBucket(status);
    if (bucket === 'todo') return UserStoryStatus.IN_PROGRESS;
    if (bucket === 'inProgress') return UserStoryStatus.PENDING;
    if (bucket === 'review') return UserStoryStatus.DONE;
    return null;
  }

  countByBucket(bucket: TaskBucket): number {
    return this.myTasks.filter((task) => task.bucket === bucket).length;
  }

  private getProjectStateLabel(state: ProjectState | undefined): string {
    if (state === ProjectState.done || state === ProjectState.validated) return 'Terminé';
    if (state === ProjectState.inProgress) return 'Actif';
    if (state === ProjectState.todo) return 'En pause';
    return 'En attente';
  }

  private getProjectStateClass(state: ProjectState | undefined): string {
    if (state === ProjectState.done || state === ProjectState.validated) return 'done';
    if (state === ProjectState.inProgress) return 'active';
    if (state === ProjectState.todo) return 'paused';
    return 'pending';
  }

  private getSprintStateLabel(value: unknown): string {
    const state = Number(value);
    if (state === 2) return 'Actif';
    if (state === 3 || state === 4) return 'Terminé';
    if (state === 1) return 'Planifié';
    return 'En attente';
  }

  private isStoryDone(value: unknown): boolean {
    return Number(value) === UserStoryStatus.DONE || Number(value) === UserStoryStatus.VALIDATED;
  }

  private toFrDate(value: unknown): string {
    if (!value) return '—';
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR');
  }

  private extractTeamChips(project: ProjectEntity | undefined, managerName: string): string[] {
    const names: string[] = [];
    if (managerName && managerName !== 'Non assigné') names.push(managerName.split(' ')[0]);
    names.push(this.userName.split(' ')[0] || 'Moi');
    if (project?.team?.name) names.push(project.team.name);
    return Array.from(new Set(names)).slice(0, 4);
  }

}
