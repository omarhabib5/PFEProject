import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CreateTaskRequest, TaskDto, TaskService, TaskState, UpdateTaskRequest } from '../Service/TaskService';
import { UserStoryService } from '../../UserStory/Service/UserStoryService';
import { UserStoryDto } from '../../UserStory/Models/userstory.model';
import { UserApiService, UserDto } from '../../Team/Service/UserApiService';
import { finalize, timeout, catchError } from 'rxjs/operators';
import { TeamService, TeamUser } from '../../Team/Service/TeamService';
import { ProjectService, project } from '../../Projet/Service/ProjectService';
import { SprintService, Sprint } from '../../Sprint/Service/SprintService';
import { combineLatest, forkJoin, of } from 'rxjs';
import { AppRole } from '../../../Auth/model/auth.model';
import { TokenService } from '../../../Auth/Service/token.service';

@Component({
  selector: 'app-task-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './task-manager.html',
  styleUrl: './task-manager.css',
})
export class TaskManager implements OnInit {
  tasks: TaskDto[] = [];
  private scopedTasksForDuplicateCheck: TaskDto[] = [];
  loading = false;
  saving = false;
  error = '';
  editMode = false;
  editingTaskId: number | null = null;
  selectedProjectId: number | null = null;
  selectedUserStoryId: number | null = null;
  prefilledStatus: TaskState = 'pending';
  userStories: UserStoryDto[] = [];
  userStoryNameMap: Record<number, string> = {};
  users: UserDto[] = [];
  assignableUsers: UserDto[] = [];
  sprints: Sprint[] = [];

  private teamMembersByTeamId: Record<number, UserDto[]> = {};
  private projectTeamIdMap: Record<number, number> = {};
  private sprintProjectIdMap: Record<number, number> = {};
  private sprintDateRangeMap: Record<number, { start: string; end: string }> = {};
  private loadingTeamIds = new Set<number>();

  statusOptions: { value: TaskState; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'todo', label: 'To Do' },
    { value: 'inProgress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'validated', label: 'Validated' }
  ];

  formModel: CreateTaskRequest = this.getEmptyForm();

  get canManageTasks(): boolean {
    const role = this.tokenService.getUserRole();
    return role === AppRole.Admin || role === AppRole.ProjectManager;
  }

  get canAssignTasks(): boolean {
    return this.canManageTasks;
  }

  constructor(
    private taskService: TaskService,
    private userStoryService: UserStoryService,
    private userApiService: UserApiService,
    private teamService: TeamService,
    private projectService: ProjectService,
    private sprintService: SprintService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private tokenService: TokenService
  ) {}

  goToDashboard(): void {
    const role = this.tokenService.getUserRole();

    if (role === AppRole.Admin) {
      void this.router.navigate(['/AdminDashboard']);
      return;
    }

    if (role === AppRole.ServiceManager) {
      void this.router.navigate(['/ResponsableServiceDashboard']);
      return;
    }

    if (role === AppRole.ProjectManager) {
      void this.router.navigate(['/ChefProjetDashboard']);
      return;
    }

    if (role === AppRole.Employee) {
      void this.router.navigate(['/EmployeeDashboard']);
      return;
    }

    if (role === AppRole.Observer) {
      void this.router.navigate(['/ObserverDashboard']);
      return;
    }

    void this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadProjectContext();

    combineLatest([this.route.params, this.route.queryParamMap]).subscribe(([params, queryParams]) => {
      const userStoryIdParam = params['userStoryId'];
      const taskIdParam = params['id'];
      const projectIdParam = queryParams.get('projectId') ?? queryParams.get('id') ?? params['projectId'];

      this.selectedProjectId = this.parsePositiveNumber(projectIdParam);
      this.prefilledStatus = this.mapRouteStatus(queryParams.get('status'));
      this.selectedUserStoryId = userStoryIdParam ? Number(userStoryIdParam) : null;

      if (this.selectedUserStoryId) {
        this.formModel.userStoryId = this.selectedUserStoryId;
      }

      if (!taskIdParam) {
        this.formModel.status = this.prefilledStatus;
      }

      this.loadUserStories(this.selectedProjectId);
      this.refreshAssignableUsers();

      this.loadTasks();

      if (taskIdParam) {
        this.loadTaskForEdit(Number(taskIdParam));
      }
    });
  }

  loadTasks(): void {
    this.loading = true;
    this.error = '';
    this.scopedTasksForDuplicateCheck = [];

    if (this.selectedProjectId) {
      forkJoin({
        tasks: this.taskService.getAll(),
        stories: this.userStoryService.getByProjectId(this.selectedProjectId).pipe(catchError(() => of([] as UserStoryDto[])))
      }).subscribe({
        next: ({ tasks, stories }) => {
          const storyIds = new Set(
            (Array.isArray(stories) ? stories : [])
              .map((story) => Number(story.id))
              .filter((id) => Number.isFinite(id) && id > 0)
          );

          const filteredByProject = (Array.isArray(tasks) ? tasks : []).filter((task) => storyIds.has(Number(task.userStoryId)));
          this.scopedTasksForDuplicateCheck = filteredByProject;

          this.tasks = this.selectedUserStoryId
            ? filteredByProject.filter((task) => Number(task.userStoryId) === this.selectedUserStoryId)
            : filteredByProject;

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Error while loading tasks';
          this.scopedTasksForDuplicateCheck = [];
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
      return;
    }

    if (this.canManageTasks) {
      this.taskService.getAll().subscribe({
        next: (data) => {
          this.scopedTasksForDuplicateCheck = Array.isArray(data) ? data : [];
          this.tasks = this.selectedUserStoryId
            ? data.filter(task => Number(task.userStoryId) === Number(this.selectedUserStoryId))
            : data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Error while loading tasks';
          this.scopedTasksForDuplicateCheck = [];
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
      return;
    }

    if (this.selectedProjectId) {
      forkJoin({
        tasks: this.taskService.getAll(),
        stories: this.userStoryService.getByProjectId(this.selectedProjectId).pipe(catchError(() => of([] as UserStoryDto[])))
      }).subscribe({
        next: ({ tasks, stories }) => {
          const storyIds = new Set(
            (Array.isArray(stories) ? stories : [])
              .map((story) => Number(story.id))
              .filter((id) => Number.isFinite(id) && id > 0)
          );

          const filteredByProject = (Array.isArray(tasks) ? tasks : []).filter((task) => storyIds.has(Number(task.userStoryId)));

          this.tasks = this.selectedUserStoryId
            ? filteredByProject.filter((task) => Number(task.userStoryId) === this.selectedUserStoryId)
            : filteredByProject;

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Error while loading tasks';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
      return;
    }

    this.taskService.getAll().subscribe({
      next: (data) => {
        this.scopedTasksForDuplicateCheck = Array.isArray(data) ? data : [];
        this.tasks = this.selectedUserStoryId
          ? data.filter(task => task.userStoryId === this.selectedUserStoryId)
          : data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error while loading tasks';
        this.scopedTasksForDuplicateCheck = [];
        this.loading = false;
           this.cdr.detectChanges();
      }
    });
  }

  startCreate(): void {
    this.editMode = false;
    this.editingTaskId = null;
    this.formModel = this.getEmptyForm();
    if (this.selectedUserStoryId) {
      this.formModel.userStoryId = this.selectedUserStoryId;
      const selectedStory = this.userStories.find((story) => Number(story.id) === Number(this.selectedUserStoryId));
      const storySprintId = Number((selectedStory as any)?.sprintId ?? (selectedStory as any)?.SprintId ?? 0);
      if (storySprintId > 0) {
        this.formModel.sprintId = storySprintId;
      }
    }
    this.formModel.status = this.prefilledStatus;
    this.onSprintChange();
    this.refreshAssignableUsers();
  }

  startEdit(task: TaskDto, event: Event): void {
    event.stopPropagation();
    this.editMode = true;
    this.editingTaskId = task.id;
    this.formModel = {
      title: task.title,
      description: task.description,
      estimatedHours: task.estimatedHours,
      status: this.normalizeStatus(task.status),
      complexity: task.complexity ?? 1,
      startDate: this.toDateInput(task.startDate),
      endDate: this.toDateInput(task.endDate),
      userStoryId: task.userStoryId,
      assignedToId: task.assignedToId ?? null,
      sprintId: task.sprintId ?? this.getSprintIdForTask(task)
    };
    this.onSprintChange();
    this.refreshAssignableUsers();
  }

  saveTask(): void {
    const title = this.formModel.title.trim();
    if (!title) {
      this.error = 'Task title is required.';
      return;
    }

    const sprintId = Number(this.formModel.sprintId ?? 0);
    if (!sprintId) {
      this.error = 'Sprint is required.';
      return;
    }

    const resolvedUserStoryId = this.resolveUserStoryIdForSprint(sprintId, Number(this.formModel.userStoryId ?? 0));
    if (!resolvedUserStoryId) {
      this.error = 'No user story is linked to the selected sprint.';
      return;
    }

    const duplicateTask = this.scopedTasksForDuplicateCheck.find((task) => {
      const taskTitle = String(task.title ?? '').trim().toLowerCase();
      const taskSprintId = Number(task.sprintId ?? 0);
      const taskId = Number(task.id ?? 0);
      if (taskId && this.editingTaskId && taskId === this.editingTaskId) {
        return false;
      }

      return taskSprintId === sprintId && taskTitle === title.toLowerCase();
    });

    if (duplicateTask) {
      this.error = 'Task already exists in this sprint.';
      return;
    }

    this.formModel.userStoryId = resolvedUserStoryId;

    if (!this.isDateInRange(this.formModel.startDate, this.taskMinDateInput, this.taskMaxDateInput)
      || !this.isDateInRange(this.formModel.endDate, this.taskMinDateInput, this.taskMaxDateInput)) {
      this.error = 'Task dates must be within the selected sprint range';
      return;
    }

    this.saving = true;
    this.error = '';

    if (this.editMode && this.editingTaskId) {
      const request: UpdateTaskRequest = {
        id: this.editingTaskId,
        ...this.formModel
      };
      this.taskService.update(request).pipe(
        timeout(15000),
        finalize(() => {
          this.saving = false;
             this.cdr.detectChanges();
        })
      ).subscribe({
        next: () => this.afterSaveSuccess(),
        error: (error) => this.afterSaveError(this.buildSaveError(error, 'Error while updating task'))
      });
      return;
    }

    this.taskService.create(this.formModel).pipe(
      timeout(15000),
      finalize(() => {
        this.saving = false;
           
      })
    ).subscribe({
      next: () =>{ this.afterSaveSuccess(),
           this.cdr.detectChanges();
      },
      error: (error) => this.afterSaveError(this.buildSaveError(error, 'Error while creating task'))
    });
  }



  deleteTask(task: TaskDto, event: Event): void {
    event.stopPropagation();

    if (!this.canDeleteTask(task)) {
      this.error = 'Only admin or service manager can delete tasks.';
      this.cdr.detectChanges();
      return;
    }

    if (!confirm(`Delete task "${task.title}"?`)) {
      return;
    }

    this.error = '';
    this.loading = true;

    this.taskService.delete(task.id).subscribe({
      next: () => {
        if (this.editingTaskId === task.id) {
          this.startCreate();
        }

        this.loadTasks();
      },
      error: (error) => {
        this.error = this.buildSaveError(error, 'Error while deleting task');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getStatusLabel(status: TaskState): string {
    const normalized = this.normalizeStatus(status);
    const found = this.statusOptions.find(option => option.value === normalized);
    return found ? found.label : String(status);
  }

  getUserStoryLabel(userStoryId: number): string {
    return this.userStoryNameMap[userStoryId] ?? `US #${userStoryId}`;
  }

  get selectedProjectSprints(): Sprint[] {
    if (!this.selectedProjectId) {
      return [];
    }

    return this.sprints.filter((sprint) => Number(sprint.projectId) === Number(this.selectedProjectId));
  }

  getUserLabel(user: UserDto): string {
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return fullName || user.email || `User #${user.id}`;
  }

  get taskMinDateInput(): string {
    const sprintRange = this.getSelectedSprintDateRange();
    if (sprintRange?.start) {
      return sprintRange.start;
    }

    const selectedStory = this.getSelectedUserStory();
    const storyStartDate = (selectedStory as any)?.startDate ?? (selectedStory as any)?.StartDate;
    if (storyStartDate) {
      return this.toDateInput(storyStartDate);
    }

    return new Date().toISOString().slice(0, 10);
  }

  get taskMaxDateInput(): string {
    const sprintRange = this.getSelectedSprintDateRange();
    if (sprintRange?.end) {
      return sprintRange.end;
    }

    const selectedStory = this.getSelectedUserStory();
    const storyEndDate = (selectedStory as any)?.endDate ?? (selectedStory as any)?.EndDate;
    if (storyEndDate) {
      return this.toDateInput(storyEndDate);
    }

    return new Date().toISOString().slice(0, 10);
  }

  onSprintChange(): void {
    const sprintId = Number(this.formModel.sprintId ?? 0);
    if (!sprintId) {
      return;
    }

    const resolvedUserStoryId = this.resolveUserStoryIdForSprint(sprintId, Number(this.formModel.userStoryId ?? 0));
    this.formModel.userStoryId = resolvedUserStoryId;

    const minDate = this.taskMinDateInput;
    const maxDate = this.taskMaxDateInput;

    if (!this.isDateInRange(this.formModel.startDate, minDate, maxDate)) {
      this.formModel.startDate = minDate || this.formModel.startDate;
    }

    if (!this.isDateInRange(this.formModel.endDate, minDate, maxDate) || this.formModel.endDate < this.formModel.startDate) {
      this.formModel.endDate = this.formModel.startDate;
    }

    if (!resolvedUserStoryId) {
      this.error = 'No user story is linked to the selected sprint.';
      this.cdr.detectChanges();
      return;
    }

    this.error = '';
    this.refreshAssignableUsers();
  }

  onTaskStartDateChange(): void {
    if (this.formModel.endDate < this.formModel.startDate) {
      this.formModel.endDate = this.formModel.startDate;
    }
  }

  private loadUserStories(projectId?: number | null): void {
    const request$ = projectId
      ? this.userStoryService.getByProjectId(projectId)
      : this.userStoryService.getAllUserStories();

    request$.subscribe({
      next: (stories) => {
        this.userStories = stories;
        this.userStoryNameMap = stories.reduce((acc, story) => {
          const storyId = Number(story.id);
          if (!Number.isNaN(storyId)) {
            acc[storyId] = story.name || story.title || `US #${storyId}`;
          }
          return acc;
        }, {} as Record<number, string>);

        if (this.formModel.userStoryId && !this.userStoryNameMap[this.formModel.userStoryId]) {
          this.formModel.userStoryId = 0;
        }

        if (!this.formModel.sprintId && this.formModel.userStoryId) {
          const selectedStory = stories.find((story) => Number(story.id) === Number(this.formModel.userStoryId));
          const storySprintId = Number((selectedStory as any)?.sprintId ?? (selectedStory as any)?.SprintId ?? 0);
          if (storySprintId > 0) {
            this.formModel.sprintId = storySprintId;
          }
        }

        this.onSprintChange();

        this.cdr.detectChanges();
        this.refreshAssignableUsers();
      },
      error: () => {
        this.userStories = [];
        this.userStoryNameMap = {};
        this.assignableUsers = [];
      }
    });
  }

  private loadUsers(): void {
    this.userApiService.getUsers().subscribe({
      next: (users) => {
        this.users = (Array.isArray(users) ? users : []).filter((user) => this.isEmployeeRole(user.role));
        this.refreshAssignableUsers();
      },
      error: () => {
        this.users = [];
        this.assignableUsers = [];
      }
    });
  }

  private loadProjectContext(): void {
    forkJoin({
      projects: this.projectService.getAllProjects().pipe(catchError(() => of([] as project[]))),
      sprints: this.sprintService.getAllSprints().pipe(catchError(() => of([] as Sprint[])))
    }).subscribe({
      next: ({ projects, sprints }) => {
        this.sprints = Array.isArray(sprints) ? sprints : [];
        this.projectTeamIdMap = (Array.isArray(projects) ? projects : []).reduce((acc, item) => {
          const projectId = Number((item as any)?.id ?? (item as any)?.Id ?? 0);
          const teamId = Number(
            (item as any)?.teamId
            ?? (item as any)?.TeamId
            ?? (item as any)?.team?.id
            ?? (item as any)?.Team?.id
            ?? 0
          );
          if (projectId > 0 && teamId > 0) {
            acc[projectId] = teamId;
          }
          return acc;
        }, {} as Record<number, number>);

        this.sprintProjectIdMap = (Array.isArray(sprints) ? sprints : []).reduce((acc, sprint) => {
          const sprintId = Number((sprint as any)?.id ?? (sprint as any)?.Id ?? 0);
          const projectId = Number((sprint as any)?.projectId ?? (sprint as any)?.ProjectId ?? 0);
          if (sprintId > 0 && projectId > 0) {
            acc[sprintId] = projectId;
          }
          return acc;
        }, {} as Record<number, number>);

        this.sprintDateRangeMap = (Array.isArray(sprints) ? sprints : []).reduce((acc, sprint) => {
          const sprintId = Number((sprint as any)?.id ?? (sprint as any)?.Id ?? 0);
          if (sprintId <= 0) {
            return acc;
          }

          const start = this.toDateInputFromAny((sprint as any)?.startDate ?? (sprint as any)?.StartDate);
          const end = this.toDateInputFromAny((sprint as any)?.endDate ?? (sprint as any)?.EndDate);

          if (start && end) {
            acc[sprintId] = { start, end };
          }

          return acc;
        }, {} as Record<number, { start: string; end: string }>);

        this.onSprintChange();

        this.refreshAssignableUsers();
      },
      error: () => {
        this.projectTeamIdMap = {};
        this.sprintProjectIdMap = {};
        this.sprintDateRangeMap = {};
        this.assignableUsers = [];
      }
    });
  }

  private isEmployeeRole(role?: string | number | null): boolean {
    if (typeof role === 'number') {
      return role === 3;
    }

    const normalized = String(role ?? '').trim().toLowerCase();
    return normalized === '3'
      || normalized === 'employee'
      || normalized === 'employer';
  }

  private loadTaskForEdit(taskId: number): void {
    this.taskService.getById(taskId).subscribe({
      next: (task) => {
        this.editMode = true;
        this.editingTaskId = task.id;
        this.formModel = {
          title: String(task.title ?? '').trim(),
          description: task.description,
          estimatedHours: task.estimatedHours,
          status: this.normalizeStatus(task.status),
          complexity: task.complexity ?? 1,
          startDate: this.toDateInput(task.startDate),
          endDate: this.toDateInput(task.endDate),
          userStoryId: task.userStoryId,
          assignedToId: task.assignedToId ?? null,
          sprintId: task.sprintId ?? null
        };
        this.refreshAssignableUsers();
      },
      error: () => {
        this.error = 'Unable to load task to edit';
      }
    });
  }

  private refreshAssignableUsers(): void {
    if (!this.canAssignTasks) {
      this.setAssignableUsers([]);
      return;
    }

    const teamId = this.resolveSelectedStoryTeamId();

    if (!teamId) {
      this.setAssignableUsers(this.users);
      return;
    }

    const cachedUsers = this.teamMembersByTeamId[teamId];
    if (cachedUsers) {
      this.setAssignableUsers(cachedUsers.length > 0 ? cachedUsers : this.users);
      return;
    }

    if (this.loadingTeamIds.has(teamId)) {
      return;
    }

    this.loadingTeamIds.add(teamId);
    forkJoin({
      members: this.teamService.getMembersByTeamId(teamId).pipe(catchError(() => of([] as TeamUser[]))),
      employees: this.teamService.getEmployeesByTeamId(teamId).pipe(catchError(() => of([] as TeamUser[]))),
      leaders: this.teamService.getLeadersByTeamId(teamId).pipe(catchError(() => of([] as TeamUser[])))
    }).pipe(
      finalize(() => this.loadingTeamIds.delete(teamId))
    ).subscribe({
      next: ({ members, employees, leaders }) => {
        const mergedMembers = [
          ...(Array.isArray(members) ? members : []),
          ...(Array.isArray(employees) ? employees : []),
          ...(Array.isArray(leaders) ? leaders : [])
        ];

        this.teamMembersByTeamId[teamId] = this.mapTeamMembersToUsers(mergedMembers);
        this.setAssignableUsers(
          this.teamMembersByTeamId[teamId].length > 0 ? this.teamMembersByTeamId[teamId] : this.users
        );
        this.cdr.detectChanges();
      },
      error: () => {
        this.teamMembersByTeamId[teamId] = [];
        this.setAssignableUsers(this.users);
        this.cdr.detectChanges();
      }
    });
  }

  private mapTeamMembersToUsers(members: TeamUser[]): UserDto[] {
    const usersById = new Map<number, UserDto>();

    (Array.isArray(members) ? members : []).forEach((member: TeamUser) => {
      const rawMember = member as any;
      const rawUser = rawMember?.user ?? rawMember?.User;
      const userId = Number(rawMember?.userId ?? rawMember?.UserId ?? rawUser?.id ?? rawUser?.Id ?? 0);
      if (!userId) {
        return;
      }

      const fallbackUser = this.users.find((user) => Number(user.id) === userId);
      const firstName = String(rawUser?.firstName ?? rawUser?.FirstName ?? fallbackUser?.firstName ?? '').trim();
      const lastName = String(rawUser?.lastName ?? rawUser?.LastName ?? fallbackUser?.lastName ?? '').trim();
      const email = String(rawUser?.email ?? rawUser?.Email ?? fallbackUser?.email ?? '').trim();

      usersById.set(userId, {
        id: userId,
        firstName,
        lastName,
        email,
        role: fallbackUser?.role
      });
    });

    return Array.from(usersById.values());
  }

  private setAssignableUsers(users: UserDto[]): void {
    this.assignableUsers = Array.isArray(users) ? users : [];

    if (this.canAssignTasks
      && this.formModel.assignedToId != null
      && !this.assignableUsers.some((user) => Number(user.id) === Number(this.formModel.assignedToId))) {
      this.formModel.assignedToId = null;
    }
  }

  private resolveSelectedStoryTeamId(): number {
    const selectedStory = this.getSelectedUserStory();
    if (!selectedStory) {
      return 0;
    }

    const directProjectId = Number((selectedStory as any)?.projectId ?? (selectedStory as any)?.ProjectId ?? 0);
    if (directProjectId > 0) {
      return Number(this.projectTeamIdMap[directProjectId] ?? 0);
    }

    const sprintId = Number((selectedStory as any)?.sprintId ?? (selectedStory as any)?.SprintId ?? 0);
    if (sprintId > 0) {
      const projectId = Number(this.sprintProjectIdMap[sprintId] ?? 0);
      if (projectId > 0) {
        return Number(this.projectTeamIdMap[projectId] ?? 0);
      }
    }

    return 0;
  }

  private afterSaveSuccess(): void {
    this.startCreate();
    this.loadTasks();
  }

  private filterTasksForProject(tasks: TaskDto[], stories: UserStoryDto[]): TaskDto[] {
    const storyIds = new Set(
      (Array.isArray(stories) ? stories : [])
        .map((story) => Number(story.id))
        .filter((id) => Number.isFinite(id) && id > 0)
    );

    return (Array.isArray(tasks) ? tasks : []).filter((task) => storyIds.has(Number(task.userStoryId)));
  }

  private afterSaveError(message: string): void {
    this.error = message;
  }

  private buildSaveError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'API connection unavailable. Check that the backend is running.';
      }

      const apiMessage = String(error.error?.message || error.error?.title || '').trim();
      const normalizedMessage = apiMessage.toLowerCase();

      if (error.status === 409 || normalizedMessage.includes('already exists') || normalizedMessage.includes('already exist')) {
        return 'Task already exists in this sprint.';
      }

      if (apiMessage) {
        return apiMessage;
      }

      return `${fallback} (HTTP ${error.status})`;
    }

    if ((error as { name?: string })?.name === 'TimeoutError') {
      return 'Request timed out. Try again in a few seconds.';
    }

    return fallback;
  }

  private normalizeStatus(status: TaskState): TaskState {
    const map: Record<number, TaskState> = {
      0: 'pending',
      1: 'todo',
      2: 'inProgress',
      3: 'done',
      4: 'validated'
    };
    return typeof status === 'number' ? map[status] ?? 'pending' : status;
  }

  private toDateInput(value?: string): string {
    if (!value) {
      return new Date().toISOString().slice(0, 10);
    }
    return value.slice(0, 10);
  }

  private mapRouteStatus(statusParam: string | null): TaskState {
    const normalized = String(statusParam ?? '').trim().toLowerCase();
    if (normalized === 'pending') return 'pending';
    if (normalized === 'todo' || normalized === 'to-do') return 'todo';
    if (normalized === 'in-progress' || normalized === 'inprogress') return 'inProgress';
    if (normalized === 'done') return 'done';
    if (normalized === 'validated') return 'validated';
    return 'pending';
  }

  private getEmptyForm(): CreateTaskRequest {
    const today = new Date().toISOString().slice(0, 10);
    return {
      title: '',
      description: '',
      estimatedHours: 1,
      status: 'pending',
      complexity: 1,
      startDate: today,
      endDate: today,
      userStoryId: this.selectedUserStoryId ?? 0,
      assignedToId: null,
      sprintId: null
    };
  }

  private getSelectedUserStory(): UserStoryDto | undefined {
    return this.userStories.find((story) => Number(story.id) === Number(this.formModel.userStoryId));
  }

  private getUserStoriesForSprint(sprintId: number): UserStoryDto[] {
    if (!sprintId) {
      return [];
    }

    return this.userStories.filter((story) => Number((story as any)?.sprintId ?? (story as any)?.SprintId ?? 0) === sprintId);
  }

  private resolveUserStoryIdForSprint(sprintId: number, preferredUserStoryId: number): number {
    const stories = this.getUserStoriesForSprint(sprintId);
    if (stories.length === 0) {
      return 0;
    }

    if (preferredUserStoryId > 0 && stories.some((story) => Number(story.id) === preferredUserStoryId)) {
      return preferredUserStoryId;
    }

    return Number(stories[0].id ?? 0);
  }

  private getSprintIdForTask(task: TaskDto): number | null {
    const taskStoryId = Number(task.userStoryId ?? 0);
    const story = this.userStories.find((item) => Number(item.id) === taskStoryId);
    const sprintId = Number((story as any)?.sprintId ?? (story as any)?.SprintId ?? 0);
    return sprintId > 0 ? sprintId : null;
  }

  private getSelectedSprintDateRange(): { start: string; end: string } | null {
    const sprintId = Number(this.formModel.sprintId ?? 0);

    if (!Number.isFinite(sprintId) || sprintId <= 0) {
      return null;
    }

    return this.sprintDateRangeMap[sprintId] ?? null;
  }

  canDeleteTask(task: TaskDto): boolean {
    const role = this.tokenService.getUserRole();
    return role === AppRole.Admin || role === AppRole.ServiceManager;
  }

  private isDateInRange(value: string, minDate?: string, maxDate?: string): boolean {
    if (!value) return false;
    if (minDate && value < minDate) return false;
    if (maxDate && value > maxDate) return false;
    return true;
  }

  private toDateInputFromAny(value: unknown): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().slice(0, 10);
  }

  private parsePositiveNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

}