import { CommonModule } from '@angular/common';
import { Component, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, Input } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
  CdkDrag,
  CdkDropList,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { AuthService } from '../Auth/Service/auth.service';
import { TokenService } from '../Auth/Service/token.service';
import { AppRole } from '../Auth/model/auth.model';
import { TaskDto, TaskService, TaskState, UpdateTaskRequest } from '../Page/Task/Service/TaskService';
import { UserStoryService } from '../Page/UserStory/Service/UserStoryService';
import { UserApiService, UserDto } from '../Page/Team/Service/UserApiService';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, DragDropModule, RouterModule],
  templateUrl: './kanban.html',
  styleUrl: './kanban.css'
})
export class KanbanComponent implements OnInit, OnChanges {
  @Input() employeeMode = false;
  @Input() observeMode = false;
  @Input() projectId: number | null = null;
  @Input() allowedProjectIds: number[] | null = null;
  @Input() useRouteProjectContext = true;

  private readonly projectContextStorageKey = 'kanban:lastProjectId';
  private currentUserId: number | null = null;

  constructor(
    private auth: AuthService,
    private tokenService: TokenService,
    private router: Router,
    private route: ActivatedRoute,
    private taskService: TaskService,
    private userStoryService: UserStoryService,
    private userApiService: UserApiService,
    private cdr: ChangeDetectorRef
  ) {}

  columns: BoardColumn[] = [
    { id: 'pending',     title: 'Not confirmed', tasks: [] },
    { id: 'todo',        title: 'To Do',         tasks: [] },
    { id: 'in-progress', title: 'In Progress',   tasks: [] },
    { id: 'done',        title: 'Done',           tasks: [] },
    { id: 'validated',   title: 'Validated',      tasks: [] }
  ];

  loading = false;
  error = '';
  visibleTaskCount = 0;
  userStoryNameMap: Record<number, string> = {};
  userNameMap: Record<number, string> = {};
  pendingObserverValidation: PendingObserverValidation | null = null;

  // ✅ Arrow function — préserve `this` quand CDK l'appelle comme callback
  public canEnterDrop = (drag: CdkDrag, drop: CdkDropList): boolean => {
    if (this.isDragDropDisabled()) return false;

    if (this.isObserverWorkflow()) {
      const sourceId = (drag.dropContainer as CdkDropList)?.id ?? '';
      // Tâche "Not confirmed" (pending) → peut être renvoyée vers To Do
      if (sourceId === 'pending') {
        return drop.id === 'todo';
      }
      // Toutes les autres → observer peut drop vers done/pending/validated uniquement
      return drop.id === 'done' || drop.id === 'pending' || drop.id === 'validated';
    }

    if (this.employeeMode) {
      return drop.id === 'todo' || drop.id === 'in-progress' || drop.id === 'done';
    }

    return true;
  };

  ngOnInit(): void {
    this.currentUserId = this.resolveCurrentUserId();

    if (this.useRouteProjectContext && (this.projectId === null || this.projectId === undefined)) {
      const projectIdParam = this.route.snapshot.queryParamMap.get('projectId');
      this.projectId = this.resolveProjectId(projectIdParam);
    }

    this.loadUserStories();
    this.loadUsers();
    this.loadTasks();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['projectId'] && !changes['projectId'].firstChange) ||
      (changes['allowedProjectIds'] && !changes['allowedProjectIds'].firstChange)
    ) {
      this.loadTasks();
    }
  }

  goToProjectDetails(): void {
    if (!this.hasProjectContext()) {
      this.error = 'Project context missing. Open Kanban from a specific project first.';
      this.cdr.detectChanges();
      return;
    }

    this.router.navigate(['/ProjectManage'], {
      queryParams: { projectId: this.projectId as number, detailTab: 'overview' }
    });
  }

  hasProjectContext(): boolean {
    return typeof this.projectId === 'number' && Number.isFinite(this.projectId) && this.projectId > 0;
  }

  isDragDropDisabled(): boolean {
    return this.tokenService.getUserRole() === AppRole.ServiceManager;
  }

  isObserverWorkflow(): boolean {
    return this.observeMode || this.tokenService.getUserRole() === AppRole.Observer;
  }

  get boardTitle(): string {
    if (this.isObserverWorkflow()) return 'Observer Kanban';
    if (this.employeeMode) return 'My Kanban';
    return 'Kanban Workspace';
  }

  get showBoardActions(): boolean {
    return !this.employeeMode && !this.observeMode;
  }

  get boardDescription(): string {
    if (this.isObserverWorkflow()) {
      return 'Déplacez une tâche vers Done pour la confirmer ou la rejeter via le panel de validation.';
    }
    if (this.employeeMode) {
      return 'You can only update your own tasks between To Do, In Progress, and Done.';
    }
    return 'Track work across every stage and keep the team aligned.';
  }

  public refresh(): void {
    this.loadTasks();
  }

  getUserStoryLabel(userStoryId: number): string {
    return this.userStoryNameMap[userStoryId] ?? `US #${userStoryId}`;
  }

  getAssignedUserLabel(task: TaskDto): string {
    if (task.assignedToName && task.assignedToName.trim().length > 0) return task.assignedToName;
    if (task.assignedToId == null) return 'Unassigned';
    return this.userNameMap[task.assignedToId] ?? `User #${task.assignedToId}`;
  }

  get connectedIds(): string[] {
    return this.boardColumns.map((col) => col.id);
  }

  get boardColumns(): BoardColumn[] {
    if (this.employeeMode) {
      return this.columns.filter((col) => ['todo', 'in-progress', 'done'].includes(col.id));
    }
    return this.columns;
  }

  getTaskStatusLabel(task: TaskDto): string {
    switch (this.normalizeTaskStatus(task.status)) {
      case 'pending':    return 'Not confirmed';
      case 'todo':       return 'To Do';
      case 'inProgress': return 'In Progress';
      case 'done':       return 'Done';
      case 'validated':  return 'Validated';
      default:           return String(task.status);
    }
  }

  getTaskStatusClass(task: TaskDto): string {
    switch (this.normalizeTaskStatus(task.status)) {
      case 'pending':    return 'pending';
      case 'todo':       return 'todo';
      case 'inProgress': return 'in-progress';
      case 'done':       return 'done';
      case 'validated':  return 'validated';
      default:           return 'unknown';
    }
  }

  addTask(column: BoardColumn): void {
    this.router.navigate(['/TaskManage'], {
      queryParams: {
        status: column.id,
        ...(this.hasProjectContext() ? { projectId: this.projectId as number } : {})
      }
    });
  }

  drop(event: CdkDragDrop<TaskDto[]>, targetColumn: BoardColumn): void {
    if (this.isDragDropDisabled()) {
      this.error = 'Service manager cannot change task status.';
      this.cdr.detectChanges();
      return;
    }

    if (this.employeeMode && !['todo', 'in-progress', 'done'].includes(targetColumn.id)) {
      this.error = 'Employees can only move tasks between To Do, In Progress, and Done.';
      this.cdr.detectChanges();
      return;
    }

    if (this.isObserverWorkflow()) {
      const sourceId = event.previousContainer.id;
      const targetId = targetColumn.id;

      // ✅ Cas spécial : tâche "Not confirmed" (pending) → To Do autorisé
      if (sourceId === 'pending' && targetId === 'todo') {
        const movedTask = event.previousContainer.data[event.previousIndex];
        if (!movedTask) return;

        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex
        );

        const previousStatus = this.normalizeTaskStatus(movedTask.status);
        movedTask.status = 'todo';
        this.persistTaskStatus(movedTask, previousStatus);
        this.error = '';
        this.cdr.detectChanges();
        return;
      }

      // Bloquer tout déplacement non autorisé pour l'observer
      if (!['done', 'pending', 'validated'].includes(targetId)) {
        this.error = 'Observers can only move tasks to Done, Pending, or Validated.';
        this.cdr.detectChanges();
        return;
      }

      if (sourceId !== 'done' && targetId !== 'todo') {
        this.error = 'Observers can only validate tasks from Done.';
        this.cdr.detectChanges();
        return;
      }
    }

    const movedTask = event.previousContainer.data[event.previousIndex];
    if (!movedTask) return;

    if (this.employeeMode && !this.isCurrentUserTask(movedTask)) {
      this.error = 'You can only modify your own tasks.';
      this.cdr.detectChanges();
      return;
    }

    // ✅ Panel de validation : déclenché quand observer drop vers 'done'
    if (this.isObserverWorkflow() && targetColumn.id === 'done' && event.previousContainer.id !== 'done') {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      this.pendingObserverValidation = {
        taskId: movedTask.id,
        taskTitle: movedTask.title,
        sourceColumnId: event.previousContainer.id,
        previousIndex: event.previousIndex,
        originalStatus: this.normalizeTaskStatus(movedTask.status)
      };

      movedTask.status = 'done';
      this.error = '';
      this.cdr.detectChanges();
      return;
    }

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    const previousStatus = this.normalizeTaskStatus(movedTask.status);
    movedTask.status = this.columnIdToStatus(targetColumn.id);
    this.persistTaskStatus(movedTask, previousStatus);
  }

  chooseObserverValidation(isConfirmed: boolean): void {
    const pending = this.pendingObserverValidation;
    if (!pending) return;

    const doneColumn = this.columns.find((c) => c.id === 'done');
    const targetColumn = this.columns.find((c) => c.id === (isConfirmed ? 'validated' : 'pending'));

    if (!doneColumn || !targetColumn) {
      this.pendingObserverValidation = null;
      this.cdr.detectChanges();
      return;
    }

    const idx = doneColumn.tasks.findIndex((t) => t.id === pending.taskId);
    if (idx < 0) {
      this.pendingObserverValidation = null;
      this.cdr.detectChanges();
      return;
    }

    const [task] = doneColumn.tasks.splice(idx, 1);
    targetColumn.tasks.push(task);
    task.status = this.columnIdToStatus(targetColumn.id);

    this.pendingObserverValidation = null;
    this.persistTaskStatus(task, 'done');
    this.cdr.detectChanges();
  }

  cancelObserverValidation(): void {
    const pending = this.pendingObserverValidation;
    if (!pending) return;

    const doneColumn = this.columns.find((c) => c.id === 'done');
    const sourceColumn = this.columns.find((c) => c.id === pending.sourceColumnId);

    if (doneColumn && sourceColumn) {
      const idx = doneColumn.tasks.findIndex((t) => t.id === pending.taskId);
      if (idx >= 0) {
        const [task] = doneColumn.tasks.splice(idx, 1);
        const insertAt = Math.min(pending.previousIndex ?? sourceColumn.tasks.length, sourceColumn.tasks.length);
        sourceColumn.tasks.splice(insertAt, 0, task);
        task.status = pending.originalStatus ?? this.columnIdToStatus(sourceColumn.id);
      }
    }

    this.pendingObserverValidation = null;
    this.cdr.detectChanges();
  }

  trackById(_: number, column: BoardColumn): string {
    return column.id;
  }

  trackByTask(_: number, task: TaskDto): number {
    return task.id;
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  private persistTaskStatus(task: TaskDto, previousStatus: TaskState): void {
    const request: UpdateTaskRequest = {
      id: task.id,
      title: task.title,
      description: task.description,
      estimatedHours: task.estimatedHours,
      status: this.normalizeTaskStatus(task.status),
      complexity: task.complexity ?? 1,
      startDate: this.toDateInput(task.startDate),
      endDate: this.toDateInput(task.endDate),
      userStoryId: task.userStoryId,
      assignedToId: task.assignedToId ?? null,
      sprintId: task.sprintId ?? null
    };

    this.taskService.update(request).subscribe({
      error: () => {
        task.status = previousStatus;
        this.loadTasks();
        this.error = 'Failed to update task status.';
        this.cdr.detectChanges();
      }
    });
  }

  private loadTasks(): void {
    this.loading = true;
    this.error = '';
    this.visibleTaskCount = 0;

    const allowedIds = this.getAllowedProjectIds();

    if (this.hasProjectContext()) {
      forkJoin({
        tasks: this.taskService.getAll(),
        stories: this.userStoryService.getByProjectId(this.projectId as number).pipe(
          catchError(() => { this.error = 'Failed to load tasks for this project.'; return of([]); })
        )
      }).subscribe({
        next: ({ tasks, stories }) => {
          const allowedStoryIds = new Set(
            (Array.isArray(stories) ? stories : [])
              .map((s: any) => Number(s?.id))
              .filter((id: number) => Number.isFinite(id) && id > 0)
          );
          const all = Array.isArray(tasks) ? tasks : [];
          this.renderTasks(all.filter((t) => this.belongsToProjectContext(t, allowedStoryIds, allowedIds)));
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.error = this.error || 'Failed to load tasks.';
          this.cdr.detectChanges();
        }
      });
      return;
    }

    if (allowedIds.size > 0) {
      forkJoin({
        tasks: this.taskService.getAll(),
        stories: this.userStoryService.getAllUserStories().pipe(catchError(() => of([])))
      }).subscribe({
        next: ({ tasks, stories }) => {
          const allowedStoryIds = new Set(
            (Array.isArray(stories) ? stories : [])
              .filter((s: any) => allowedIds.has(Number(s?.projectId ?? 0)))
              .map((s: any) => Number(s?.id))
              .filter((id: number) => Number.isFinite(id) && id > 0)
          );
          const all = Array.isArray(tasks) ? tasks : [];
          this.renderTasks(all.filter((t) => this.belongsToProjectContext(t, allowedStoryIds, allowedIds)));
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.error = 'Failed to load tasks.';
          this.cdr.detectChanges();
        }
      });
      return;
    }

    this.taskService.getAll().subscribe({
      next: (tasks: TaskDto[]) => {
        this.renderTasks(tasks);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load tasks.';
        this.cdr.detectChanges();
      }
    });
  }

  private renderTasks(tasks: TaskDto[]): void {
    this.columns.forEach((col) => (col.tasks = []));
    this.cdr.detectChanges();

    const visibleTasks = this.employeeMode
      ? (Array.isArray(tasks) ? tasks : []).filter((t) => this.isCurrentUserTask(t))
      : (Array.isArray(tasks) ? tasks : []);

    visibleTasks.forEach((task) => {
      const status = this.normalizeTaskStatus(task.status);
      const displayStatus = this.employeeMode ? this.mapEmployeeDisplayStatus(status) : status;
      const col = this.boardColumns.find((c) => this.columnIdToStatus(c.id) === displayStatus);
      if (col) col.tasks.push(task);
    });

    this.visibleTaskCount = visibleTasks.length;
    this.cdr.detectChanges();
  }

  private belongsToProjectContext(task: TaskDto, allowedStoryIds: Set<number>, allowedProjectIds: Set<number>): boolean {
    const storyId = Number(task.userStoryId ?? -1);
    const directProjectId = Number((task as any)?.projectId ?? (task as any)?.ProjectId ?? -1);

    if (allowedProjectIds.size > 0) {
      return allowedStoryIds.size > 0
        ? allowedStoryIds.has(storyId)
        : (Number.isFinite(directProjectId) && allowedProjectIds.has(directProjectId));
    }

    if (this.hasProjectContext()) {
      return allowedStoryIds.size > 0
        ? allowedStoryIds.has(storyId)
        : directProjectId === this.projectId;
    }

    return true;
  }

  private getAllowedProjectIds(): Set<number> {
    return new Set(
      (Array.isArray(this.allowedProjectIds) ? this.allowedProjectIds : [])
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v) && v > 0)
    );
  }

  private loadUserStories(): void {
    this.userStoryService.getAllUserStories().subscribe({
      next: (stories: any[]) => {
        this.userStoryNameMap = stories.reduce((acc, s) => {
          const id = Number(s.id);
          if (!Number.isNaN(id)) acc[id] = s.name || s.title || `US #${id}`;
          return acc;
        }, {} as Record<number, string>);
        this.cdr.detectChanges();
      },
      error: () => { this.userStoryNameMap = {}; }
    });
  }

  private loadUsers(): void {
    this.userApiService.getUsers().subscribe({
      next: (users: UserDto[]) => {
        this.userNameMap = (Array.isArray(users) ? users : []).reduce((acc, u) => {
          const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
          acc[u.id] = name || u.email || `User #${u.id}`;
          return acc;
        }, {} as Record<number, string>);
        this.cdr.detectChanges();
      },
      error: () => { this.userNameMap = {}; }
    });
  }

  private columnIdToStatus(columnId: string): TaskState {
    const map: Record<string, TaskState> = {
      pending:       'pending',
      todo:          'todo',
      'in-progress': 'inProgress',
      done:          'done',
      validated:     'validated'
    };
    return map[columnId] ?? 'pending';
  }

  private normalizeTaskStatus(status: TaskState): TaskState {
    const byNumber: Record<number, TaskState> = {
      0: 'pending', 1: 'todo', 2: 'inProgress', 3: 'done', 4: 'validated'
    };
    if (typeof status === 'number') return byNumber[status] ?? 'pending';
    if (String(status).toLowerCase() === 'inprogress') return 'inProgress';
    return status;
  }

  private mapEmployeeDisplayStatus(status: TaskState): TaskState {
    if (status === 'pending') return 'todo';
    if (status === 'validated') return 'done';
    return status;
  }

  private toDateInput(value?: string): string {
    if (!value) return new Date().toISOString().slice(0, 10);
    return value.slice(0, 10);
  }

  private resolveProjectId(projectIdParam: string | null): number | null {
    if (this.projectId !== null && Number.isFinite(Number(this.projectId)) && Number(this.projectId) > 0) {
      return Number(this.projectId);
    }

    const fromQuery = Number(projectIdParam);
    if (projectIdParam && Number.isFinite(fromQuery) && fromQuery > 0) {
      localStorage.setItem(this.projectContextStorageKey, String(fromQuery));
      return fromQuery;
    }

    const cached = Number(localStorage.getItem(this.projectContextStorageKey));
    if (Number.isFinite(cached) && cached > 0) return cached;

    return null;
  }

  private resolveCurrentUserId(): number | null {
    const user = this.tokenService.getUserData();
    const fromUserData = Number(user?.userId ?? user?.id ?? 0);
    if (Number.isFinite(fromUserData) && fromUserData > 0) return fromUserData;

    const payload = this.tokenService.getTokenPayload();
    const fromClaims = Number(
      payload?.['nameid'] ?? payload?.['sub'] ??
      payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? 0
    );
    return Number.isFinite(fromClaims) && fromClaims > 0 ? fromClaims : null;
  }

  private isCurrentUserTask(task: TaskDto): boolean {
    if (!this.currentUserId) return false;
    return Number(task.assignedToId ?? 0) === this.currentUserId;
  }
}

interface BoardColumn {
  id: string;
  title: string;
  tasks: TaskDto[];
}

interface PendingObserverValidation {
  taskId: number;
  taskTitle: string;
  sourceColumnId: string;
  previousIndex?: number;
  originalStatus?: TaskState;
}