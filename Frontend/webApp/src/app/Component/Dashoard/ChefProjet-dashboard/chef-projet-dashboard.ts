import { CommonModule } from '@angular/common';
import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

type DashboardSection = 'projects' | 'calendar' | 'settings';
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

@Component({
  selector: 'app-chef-projet-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './chef-projet-dashboard.html',
  styleUrl: './chef-projet-dashboard.css',
})
export class ChefProjetDashboard implements OnInit {
  private projectService = inject(ProjectService);
  private sprintService = inject(SprintService);
  private taskService = inject(TaskService);
  private userStoryService = inject(UserStoryService);
  private userApiService = inject(UserApiService);
  private tokenService = inject(TokenService);

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
  error = '';
  success = '';

  projects: project[] = [];
  sprints: Sprint[] = [];
  tasks: TaskDto[] = [];
  userStories: UserStoryDto[] = [];
  employeeUsers: UserDto[] = [];

  selectedProjectFilter: number | 'all' = 'all';
  selectedSprintFilter: number | 'all' = 'all';
  selectedTaskStatusFilter: TaskState | 'all' = 'all';

  showSprintForm = false;
  sprintEditId: number | null = null;
  sprintForm: SprintFormModel = this.getEmptySprintForm();

  showTaskForm = false;
  taskEditId: number | null = null;
  taskForm: TaskFormModel = this.getEmptyTaskForm();

  sprintStateOptions = [
    { value: State.pending, label: 'Pending' },
    { value: State.todo, label: 'To Do' },
    { value: State.inProgress, label: 'In Progress' },
    { value: State.done, label: 'Done' },
    { value: State.validated, label: 'Validated' },
  ];

  taskStatusOptions: { value: TaskState; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'todo', label: 'To Do' },
    { value: 'inProgress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'validated', label: 'Validated' },
  ];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  setSection(section: DashboardSection): void {
    this.activeSection = section;
    this.clearMessages();
  }

  setProjectTab(tab: ProjectTab): void {
    this.activeProjectTab = tab;
    this.clearMessages();
  }

  get currentProject(): project | null {
    if (this.projects.length === 0) {
      return null;
    }

    const selectedId = Number(this.selectedProjectFilter);
    if (!Number.isNaN(selectedId) && this.scopedProjectIds.has(selectedId)) {
      const selected = this.projects.find((item) => Number(item.id) === selectedId);
      if (selected) {
        return selected;
      }
    }

    return this.projects[0] ?? null;
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
    return fullName || 'Chef de projet';
  }

  get managerRoleLabel(): string {
    const role = String(this.tokenService.getUserData()?.role ?? '').trim();
    return role || 'Project Manager';
  }

  get currentDateLabel(): string {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  get teamDisplayMembers(): string[] {
    const members = new Set<string>();

    for (const task of this.tasks) {
      const name = String(task.assignedToName ?? '').trim();
      if (name) {
        members.add(name);
      }
    }

    return Array.from(members).slice(0, 8);
  }

  get completedStoriesCount(): number {
    return this.userStories.filter((story) => {
      const rawStatus = String(story?.status ?? '').toLowerCase();
      const numericState = Number((story as any)?.userStoryState ?? -1);
      return rawStatus.includes('done') || numericState === 3 || numericState === 4;
    }).length;
  }

  get totalStoryPoints(): number {
    return this.userStories.reduce((sum, story) => sum + Number(story.storyPoints ?? 0), 0);
  }

  get completedStoryPoints(): number {
    return this.userStories.reduce((sum, story) => {
      const rawStatus = String(story?.status ?? '').toLowerCase();
      const numericState = Number((story as any)?.userStoryState ?? -1);
      const isDone = rawStatus.includes('done') || numericState === 3 || numericState === 4;
      return sum + (isDone ? Number(story.storyPoints ?? 0) : 0);
    }, 0);
  }

  get userStoriesProgress(): number {
    if (this.totalStoryPoints <= 0) {
      return this.userStories.length > 0 ? Math.round((this.completedStoriesCount / this.userStories.length) * 100) : 0;
    }
    return Math.round((this.completedStoryPoints / this.totalStoryPoints) * 100);
  }

  get sprintProgress(): number {
    if (this.sprints.length === 0) {
      return 0;
    }
    return Math.round((this.activeSprintsCount / this.sprints.length) * 100);
  }

  get tasksProgress(): number {
    if (this.tasks.length === 0) {
      return 0;
    }
    return Math.round((this.completedTasksCount / this.tasks.length) * 100);
  }

  get progressLineWidth(): number {
    return Math.max(4, Math.min(this.globalProgress, 100));
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
      this.error = 'Utilisateur chef de projet non identifié.';
      return;
    }

    forkJoin({
      projects: this.projectService.getAllProjects().pipe(catchError(() => of([] as project[]))),
      sprints: this.sprintService.getAllSprints().pipe(catchError(() => of([] as Sprint[]))),
      tasks: this.taskService.getAll().pipe(catchError(() => of([] as TaskDto[]))),
      userStories: this.userStoryService.getAllUserStories().pipe(catchError(() => of([] as UserStoryDto[]))),
      users: this.userApiService.getUsers().pipe(catchError(() => of([] as UserDto[]))),
    }).subscribe({
      next: ({ projects, sprints, tasks, userStories, users }) => {
        this.applyScopedData(projects, sprints, tasks, userStories);
        this.employeeUsers = (users ?? []).filter((user) => this.isEmployeeRole(user.role));

        if (this.projects.length === 0) {
          this.error = 'Aucun projet ne vous est attribué.';
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger les données du dashboard.';
        this.loading = false;
          this.cdr.detectChanges();
      },
    });
  }

  get filteredSprints(): Sprint[] {
    if (this.selectedProjectFilter === 'all') {
      return this.sprints;
    }
    return this.sprints.filter((s) => s.projectId === this.selectedProjectFilter);
  }

  get filteredTasks(): TaskDto[] {
    return this.tasks.filter((task) => {
      const sprintMatches =
        this.selectedSprintFilter === 'all' || Number(task.sprintId ?? 0) === Number(this.selectedSprintFilter);
      const statusMatches =
        this.selectedTaskStatusFilter === 'all' || this.normalizeTaskState(task.status) === this.selectedTaskStatusFilter;
      return sprintMatches && statusMatches;
    });
  }

  get completedTasksCount(): number {
    return this.tasks.filter((task) => {
      const status = this.normalizeTaskState(task.status);
      return status === 'done' || status === 'validated';
    }).length;
  }

  get activeSprintsCount(): number {
    return this.sprints.filter((s) => s.sprintState === State.todo || s.sprintState === State.inProgress).length;
  }

  get globalProgress(): number {
    if (this.tasks.length === 0) {
      return 0;
    }
    return Math.round((this.completedTasksCount / this.tasks.length) * 100);
  }

  openCreateSprint(): void {
    this.sprintEditId = null;
    this.showSprintForm = true;
    this.sprintForm = this.getEmptySprintForm();
    if (this.projects.length === 1) {
      this.sprintForm.projectId = Number(this.projects[0].id ?? 0);
    }
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
      this.error = 'Le nom du sprint et le projet sont obligatoires.';
      return;
    }

    if (!this.scopedProjectIds.has(Number(this.sprintForm.projectId))) {
      this.error = 'Vous ne pouvez gérer que vos propres projets.';
      return;
    }

    if (new Date(this.sprintForm.endDate) <= new Date(this.sprintForm.startDate)) {
      this.error = 'La date de fin doit être après la date de début.';
      return;
    }

    if (!this.isDateInRange(this.sprintForm.startDate, this.projectStartDateInput, this.projectEndDateInput)
      || !this.isDateInRange(this.sprintForm.endDate, this.projectStartDateInput, this.projectEndDateInput)) {
      this.error = 'Les dates du sprint doivent être dans l\'intervalle du projet.';
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
          this.success = 'Sprint mis à jour avec succès.';
          this.sprintSaving = false;
          this.cancelSprintForm();
          this.loadSprints();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Erreur lors de la mise à jour du sprint.';
          this.sprintSaving = false;
        },
      });
      return;
    }

    this.sprintService.createSprint(payload).subscribe({
      next: () => {
        this.success = 'Sprint créé avec succès.';
        this.sprintSaving = false;
        this.cancelSprintForm();
        this.loadSprints();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors de la création du sprint.';
        this.sprintSaving = false;
      },
    });
  }

  deleteSprint(sprint: Sprint): void {
    if (!confirm(`Supprimer le sprint "${sprint.name}" ?`)) {
      return;
    }

    this.clearMessages();
    this.sprintService.deleteSprint(sprint.id).subscribe({
      next: () => {
        this.success = 'Sprint supprimé avec succès.';
        this.loadSprints();
          this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors de la suppression du sprint.';
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
      this.error = 'Le titre de la tâche et la user story sont obligatoires.';
      return;
    }

    if (!this.scopedUserStoryIds.has(Number(this.taskForm.userStoryId))) {
      this.error = 'Vous ne pouvez créer des tâches que dans vos user stories.';
      return;
    }

    if (this.taskForm.sprintId && !this.scopedSprintIds.has(Number(this.taskForm.sprintId))) {
      this.error = 'Vous ne pouvez sélectionner que vos propres sprints.';
      return;
    }

    if (new Date(this.taskForm.endDate) < new Date(this.taskForm.startDate)) {
      this.error = 'La date de fin doit être après ou égale à la date de début.';
      return;
    }

    if (!this.isDateInRange(this.taskForm.startDate, this.taskMinDateInput, this.taskMaxDateInput)
      || !this.isDateInRange(this.taskForm.endDate, this.taskMinDateInput, this.taskMaxDateInput)) {
      this.error = 'Les dates de la tâche sont hors intervalle autorisé.';
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
          this.success = 'Tâche mise à jour avec succès.';
          this.taskSaving = false;
          this.cancelTaskForm();
          this.loadTasks();
          this.cdr.detectChanges();
        },


        error: (err) => {
          this.error = err?.error?.message || 'Erreur lors de la mise à jour de la tâche.';
          this.taskSaving = false;
          this.cdr.detectChanges();
        },

      });
      return;
    }

    this.taskService.create(payload).subscribe({
      next: () => {
        this.success = 'Tâche créée avec succès.';
        this.taskSaving = false;
        this.cancelTaskForm();
        this.loadTasks();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors de la création de la tâche.';
        this.taskSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteTask(task: TaskDto): void {
    if (!confirm(`Supprimer la tâche "${task.title}" ?`)) {
      return;
    }

    this.clearMessages();
    this.taskService.delete(task.id).subscribe({
      next: () => {
        this.success = 'Tâche supprimée avec succès.';
        this.loadTasks();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors de la suppression de la tâche.';
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
    return item?.name ?? 'Projet inconnu';
  }

  getSprintName(sprintId?: number | null): string {
    if (!sprintId) {
      return 'Non assigné';
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
      return 'Non assigné';
    }

    const assignedUser = this.employeeUsers.find((user) => Number(user.id) === assignedId);
    return assignedUser ? this.getEmployeeLabel(assignedUser) : `User #${assignedId}`;
  }

  getUserStoryProgress(story: UserStoryDto): number {
    const total = Number((story as any)?.taskCount ?? 0);
    const completed = Number((story as any)?.completedTaskCount ?? 0);
    if (total <= 0) {
      return this.isUserStoryDone(story) ? 100 : 0;
    }

    return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
  }

  getTaskAssigneeName(task: TaskDto): string {
    const assignedName = String((task as any)?.assignedToName ?? '').trim();
    if (assignedName) {
      return assignedName;
    }

    const assignedId = Number((task as any)?.assignedToId ?? 0);
    if (!assignedId) {
      return 'Non assigné';
    }

    const assignedUser = this.employeeUsers.find((user) => Number(user.id) === assignedId);
    if (assignedUser) {
      return this.getEmployeeLabel(assignedUser);
    }

    return `User #${assignedId}`;
  }

  getSprintStateLabel(state: State): string {
    const found = this.sprintStateOptions.find((option) => option.value === state);
    return found?.label ?? 'Unknown';
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

  formatDate(value?: Date | string): string {
    if (!value) {
      return '-';
    }
    return new Date(value).toLocaleDateString('fr-FR');
  }

  private loadSprints(): void {
    this.sprintService.getAllSprints().subscribe({
      next: (data) => {
        this.sprints = data.filter((sprint) => this.scopedProjectIds.has(Number(sprint.projectId)));
        this.scopedSprintIds = new Set(this.sprints.map((item) => Number(item.id)));
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de recharger les sprints.';
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
          this.cdr.detectChanges();
          return this.scopedSprintIds.has(taskSprintId) || this.scopedUserStoryIds.has(taskUserStoryId);
        
        });
      },
      error: () => {
        this.error = 'Impossible de recharger les tâches.';
        this.cdr.detectChanges();
      },
    });
  }

  private applyScopedData(projects: project[], sprints: Sprint[], tasks: TaskDto[], userStories: UserStoryDto[]): void {
    const ownedProjects = projects.filter(
      (item) => Number(item.projectManagerId) === Number(this.currentManagerId)
    );

    this.projects = ownedProjects;
    this.scopedProjectIds = new Set(ownedProjects.map((item) => Number(item.id ?? 0)).filter((id) => id > 0));

    this.sprints = sprints.filter((item) => this.scopedProjectIds.has(Number(item.projectId)));
    this.scopedSprintIds = new Set(this.sprints.map((item) => Number(item.id)));

    this.userStories = userStories.filter((story) => {
      const storyProjectId = Number((story as any)?.projectId ?? 0);
      const storySprintId = Number(story?.sprintId ?? 0);
      if (storyProjectId > 0) {
        return this.scopedProjectIds.has(storyProjectId);
      }
      return this.scopedSprintIds.has(storySprintId);
    });
    this.scopedUserStoryIds = new Set(this.userStories.map((item) => Number(item.id)).filter((id) => id > 0));

    this.tasks = tasks.filter((task) => {
      const taskSprintId = Number(task.sprintId ?? 0);
      const taskUserStoryId = Number(task.userStoryId ?? 0);
      return this.scopedSprintIds.has(taskSprintId) || this.scopedUserStoryIds.has(taskUserStoryId);
    });

    if (this.projects.length === 1) {
      this.selectedProjectFilter = Number(this.projects[0].id ?? 'all');
      if (this.sprintForm.projectId <= 0) {
        this.sprintForm.projectId = Number(this.projects[0].id ?? 0);
      }
    } else if (this.selectedProjectFilter !== 'all' && !this.scopedProjectIds.has(Number(this.selectedProjectFilter))) {
      this.selectedProjectFilter = 'all';
    }

    if (this.selectedSprintFilter !== 'all' && !this.scopedSprintIds.has(Number(this.selectedSprintFilter))) {
      this.selectedSprintFilter = 'all';
    }

    if (this.taskForm.userStoryId > 0 && !this.scopedUserStoryIds.has(Number(this.taskForm.userStoryId))) {
      this.taskForm.userStoryId = this.userStories.length > 0 ? Number(this.userStories[0].id) : 0;
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
    return new Date(value).toISOString().slice(0, 10);
  }

  private getSelectedTaskUserStory(): UserStoryDto | undefined {
    return this.userStories.find((item) => Number(item.id) === Number(this.taskForm.userStoryId));
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

  private clearMessages(): void {
    this.error = '';
    this.success = '';
  }

}