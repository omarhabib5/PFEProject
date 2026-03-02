import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CreateTaskRequest, TaskDto, TaskService, TaskState, UpdateTaskRequest } from '../Service/TaskService';

@Component({
  selector: 'app-task-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './task-manager.html',
  styleUrl: './task-manager.css',
})
export class TaskManager implements OnInit {
  tasks: TaskDto[] = [];
  userStories: Array<{ id: number; title?: string; name?: string }> = [];
  loading = false;
  saving = false;
  error = '';
  editMode = false;
  editingTaskId: number | null = null;
  selectedUserStoryId: number | null = null;

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
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const userStoryIdParam = params['userStoryId'];
      const taskIdParam = params['id'];
      this.selectedUserStoryId = userStoryIdParam ? Number(userStoryIdParam) : null;

      if (this.selectedUserStoryId) {
        this.formModel.userStoryId = this.selectedUserStoryId;
      }

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
        this.syncUserStoriesFromTasks(data);
        this.tasks = this.selectedUserStoryId
          ? data.filter(task => task.userStoryId === this.selectedUserStoryId)
          : data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement des tâches';
        this.loading = false;
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
  }

  saveTask(): void {
    if (!this.formModel.title.trim() || !this.formModel.userStoryId) {
      this.error = 'Titre et User Story sont obligatoires';
      return;
    }

    this.saving = true;
    this.error = '';

    if (this.editMode && this.editingTaskId) {
      const request: UpdateTaskRequest = {
        id: this.editingTaskId,
        ...this.formModel
      };
      this.taskService.update(request).subscribe({
        next: () => this.afterSaveSuccess(),
        error: () => this.afterSaveError('Erreur lors de la mise à jour de la tâche')
      });
      return;
    }

    this.taskService.create(this.formModel).subscribe({
      next: () => this.afterSaveSuccess(),
      error: () => this.afterSaveError('Erreur lors de la création de la tâche')
    });
  }

  openTask(task: TaskDto): void {
    this.router.navigate(['/task/view', task.id]);
  }

  getStatusLabel(status: TaskState): string {
    const normalized = this.normalizeStatus(status);
    const found = this.statusOptions.find(option => option.value === normalized);
    return found ? found.label : String(status);
  }

  getUserStoryLabel(userStoryId: number): string {
    const story = this.userStories.find((item) => Number(item.id) === Number(userStoryId));
    if (!story) {
      return `US #${userStoryId}`;
    }

    return story.name || story.title || `US #${story.id}`;
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
      },
      error: () => {
        this.error = 'Impossible de charger la tâche à modifier';
      }
    });
  }

  private afterSaveSuccess(): void {
    this.saving = false;
    this.startCreate();
    this.loadTasks();
  }

  private afterSaveError(message: string): void {
    this.saving = false;
    this.error = message;
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

  private syncUserStoriesFromTasks(taskItems: TaskDto[]): void {
    const uniqueStoryIds = new Set<number>();
    this.userStories = [];

    taskItems.forEach((task) => {
      const storyId = Number(task.userStoryId);
      if (!Number.isFinite(storyId) || storyId <= 0 || uniqueStoryIds.has(storyId)) {
        return;
      }

      uniqueStoryIds.add(storyId);
      this.userStories.push({
        id: storyId,
        title: `US #${storyId}`
      });
    });
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

}
