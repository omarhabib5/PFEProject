import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CreateTaskRequest, TaskDto, TaskService, TaskState, UpdateTaskRequest } from '../Service/TaskService';
import { UserStoryService } from '../../UserStory/Service/UserStoryService';
import { UserStoryDto } from '../../UserStory/Model/userstory.model';
import { UserApiService, UserDto } from '../../Team/Service/UserApiService';
import { finalize, timeout, catchError } from 'rxjs/operators';
import { TeamService, TeamUser } from '../../Team/Service/TeamService';
import { ProjectService, project } from '../../Projet/Service/ProjectService';
import { SprintService, Sprint } from '../../Sprint/Service/SprintService';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-task-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './task-manager.html',
  styleUrl: './task-manager.css',
})
export class TaskManager implements OnInit {
  tasks: TaskDto[] = [];
  loading = false;
  saving = false;
  error = '';
  editMode = false;
  editingTaskId: number | null = null;
  selectedUserStoryId: number | null = null;
  prefilledStatus: TaskState = 'pending';
  userStories: UserStoryDto[] = [];
  userStoryNameMap: Record<number, string> = {};
  users: UserDto[] = [];
  assignableUsers: UserDto[] = [];

  private teamMembersByTeamId: Record<number, UserDto[]> = {};
  private projectTeamIdMap: Record<number, number> = {};
  private sprintProjectIdMap: Record<number, number> = {};
  private loadingTeamIds = new Set<number>();

  statusOptions: { value: TaskState; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'todo', label: 'To Do' },
    { value: 'inProgress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'validated', label: 'Validated' }
  ];

  formModel: CreateTaskRequest = this.getEmptyForm();

  constructor(
    private taskService: TaskService,
    private userStoryService: UserStoryService,
    private userApiService: UserApiService,
    private teamService: TeamService,
    private projectService: ProjectService,
    private sprintService: SprintService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserStories();
    this.loadUsers();
    this.loadProjectContext();

    this.route.params.subscribe((params) => {
      const userStoryIdParam = params['userStoryId'];
      const taskIdParam = params['id'];
      this.prefilledStatus = this.mapRouteStatus(this.route.snapshot.queryParamMap.get('status'));
      this.selectedUserStoryId = userStoryIdParam ? Number(userStoryIdParam) : null;

      if (this.selectedUserStoryId) {
        this.formModel.userStoryId = this.selectedUserStoryId;
      }

      if (!taskIdParam) {
        this.formModel.status = this.prefilledStatus;
      }

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

    this.taskService.getAll().subscribe({
      next: (data) => {
        this.tasks = this.selectedUserStoryId
          ? data.filter(task => task.userStoryId === this.selectedUserStoryId)
          : data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error while loading tasks';
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
    }
    this.formModel.status = this.prefilledStatus;
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
      sprintId: task.sprintId ?? null
    };
    this.refreshAssignableUsers();
  }

  saveTask(): void {
    if (!this.formModel.title.trim() || !this.formModel.userStoryId) {
      this.error = 'Title and user story are required';
      return;
    }

    if (!this.isDateInRange(this.formModel.startDate, this.taskMinDateInput, this.taskMaxDateInput)
      || !this.isDateInRange(this.formModel.endDate, this.taskMinDateInput, this.taskMaxDateInput)) {
      this.error = 'Task dates must be within the allowed user story range';
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

  openTask(task: TaskDto): void {
    this.router.navigate(['/task/view', task.id]);
  }

  deleteTask(task: TaskDto, event: Event): void {
    event.stopPropagation();

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

  getUserLabel(user: UserDto): string {
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return fullName || user.email || `User #${user.id}`;
  }

  get taskMinDateInput(): string {
    const selectedStory = this.getSelectedUserStory();
    if (!selectedStory?.startDate) {
      return '';
    }

    return this.toDateInput(new Date(selectedStory.startDate).toISOString());
  }

  get taskMaxDateInput(): string {
    const selectedStory = this.getSelectedUserStory();
    if (!selectedStory?.endDate) {
      return '';
    }

    return this.toDateInput(new Date(selectedStory.endDate).toISOString());
  }

  onUserStoryChange(): void {
    const minDate = this.taskMinDateInput;
    const maxDate = this.taskMaxDateInput;

    if (!this.isDateInRange(this.formModel.startDate, minDate, maxDate)) {
      this.formModel.startDate = minDate || this.formModel.startDate;
    }

    if (!this.isDateInRange(this.formModel.endDate, minDate, maxDate) || this.formModel.endDate < this.formModel.startDate) {
      this.formModel.endDate = this.formModel.startDate;
    }

    this.refreshAssignableUsers();
  }

  onTaskStartDateChange(): void {
    if (this.formModel.endDate < this.formModel.startDate) {
      this.formModel.endDate = this.formModel.startDate;
    }
  }

  private loadUserStories(): void {
    this.userStoryService.getAllUserStories().subscribe({
      next: (stories) => {
        this.userStories = stories;
        this.userStoryNameMap = stories.reduce((acc, story) => {
          const storyId = Number(story.id);
          if (!Number.isNaN(storyId)) {
            acc[storyId] = story.name || story.title || `US #${storyId}`;
          }
          return acc;
        }, {} as Record<number, string>);

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

        this.refreshAssignableUsers();
      },
      error: () => {
        this.projectTeamIdMap = {};
        this.sprintProjectIdMap = {};
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
          title: task.title,
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

    if (this.formModel.assignedToId != null
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

  private afterSaveError(message: string): void {
    this.error = message;
  }

  private buildSaveError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'API connection unavailable. Check that the backend is running.';
      }

      const apiMessage = error.error?.message || error.error?.title;
      if (apiMessage) {
        return String(apiMessage);
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

  private isDateInRange(value: string, minDate?: string, maxDate?: string): boolean {
    if (!value) return false;
    if (minDate && value < minDate) return false;
    if (maxDate && value > maxDate) return false;
    return true;
  }

}