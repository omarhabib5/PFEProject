import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService, Task, CreateTaskDto, UpdateTaskDto, State } from '../Service/TaskService';
import { UserStoryService, UserStory } from '../../UserStory/Service/UserStoryService';
import { SprintService, Sprint } from '../../Sprint/Service/SprintService';

@Component({
  selector: 'app-task-manager',
  imports: [CommonModule, FormsModule],
  templateUrl: './task-manager.html',
  styleUrl: './task-manager.css',
})
export class TaskManager implements OnInit {
  private taskService = inject(TaskService);
  private userStoryService = inject(UserStoryService);
  private sprintService = inject(SprintService);
  private cdr = inject(ChangeDetectorRef);

  tasks: Task[] = [];
  userStories: UserStory[] = [];
  sprints: Sprint[] = [];

  loading = false;
  showCreateTaskForm = false;
  isEditMode = false;
  editingTaskId: number | null = null;
  error: string | null = null;
  successMessage: string | null = null;
  draggedTask: Task | null = null;

  State = State;
  orderedStates: State[] = [State.pending, State.todo, State.inProgress, State.done, State.validated];
  stateOptions = [
    { value: State.pending, label: 'Pending' },
    { value: State.todo, label: 'To Do' },
    { value: State.inProgress, label: 'In Progress' },
    { value: State.done, label: 'Done' },
    { value: State.validated, label: 'Validated' },
  ];

  newTask = {
    name: '',
    description: '',
    estimationDuration: 0,
    startDate: this.formatDateForInput(new Date()),
    endDate: this.formatDateForInput(new Date()),
    taskState: State.todo,
    complexity: 1,
    userStoryId: 0,
  };

  ngOnInit(): void {
    this.loadTasks();
    this.loadUserStories();
    this.loadSprints();
  }

  loadTasks(): void {
    this.loading = true;
    this.error = null;

    this.taskService.getAllTasks().subscribe({
      next: (data) => {
        this.tasks = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load tasks: ' + (err.error?.message || err.message);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadUserStories(): void {
    this.userStoryService.getAllUserStories().subscribe({
      next: (data) => {
        this.userStories = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load user stories:', err);
      },
    });
  }

  loadSprints(): void {
    this.sprintService.getAllSprints().subscribe({
      next: (data) => {
        this.sprints = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load sprints:', err);
      },
    });
  }

  toggleCreateTaskForm(): void {
    this.showCreateTaskForm = !this.showCreateTaskForm;
    if (!this.showCreateTaskForm) {
      this.resetForm();
    }
  }

  createTask(): void {
    if (!this.validateForm()) {
      return;
    }

    const startDate = new Date(this.newTask.startDate);
    const endDate = new Date(this.newTask.endDate);
    this.newTask.estimationDuration = this.calculateDurationInDays(startDate, endDate);

    const payload: CreateTaskDto = {
      name: this.newTask.name.trim(),
      description: this.newTask.description.trim(),
      estimationDuration: Number(this.newTask.estimationDuration),
      startDate,
      endDate,
      taskState: Number(this.newTask.taskState),
      complexity: Number(this.newTask.complexity),
      userStoryId: Number(this.newTask.userStoryId),
    };

    this.loading = true;
    this.error = null;

    this.taskService.createTask(payload).subscribe({
      next: () => {
        this.successMessage = 'Task created successfully!';
        this.loadTasks();
        this.resetForm();
        this.showCreateTaskForm = false;
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => (this.successMessage = null), 3000);
      },
      error: (err) => {
        this.error = 'Failed to create task: ' + (err.error?.message || err.message);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  startEditTask(task: Task): void {
    this.isEditMode = true;
    this.editingTaskId = task.id;
    this.showCreateTaskForm = true;

    this.newTask = {
      name: task.name,
      description: task.description || '',
      estimationDuration: task.estimationDuration,
      startDate: this.formatDateForInput(new Date(task.startDate)),
      endDate: this.formatDateForInput(new Date(task.endDate)),
      taskState: task.taskState,
      complexity: task.complexity,
      userStoryId: task.userStoryId,
    };

    this.onTaskDatesChange();
  }

  updateTask(): void {
    if (!this.validateForm() || this.editingTaskId === null) {
      return;
    }

    const startDate = new Date(this.newTask.startDate);
    const endDate = new Date(this.newTask.endDate);
    this.newTask.estimationDuration = this.calculateDurationInDays(startDate, endDate);

    const payload: UpdateTaskDto = {
      id: this.editingTaskId,
      name: this.newTask.name.trim(),
      description: this.newTask.description.trim(),
      estimationDuration: Number(this.newTask.estimationDuration),
      startDate,
      endDate,
      taskState: Number(this.newTask.taskState),
      complexity: Number(this.newTask.complexity),
      userStoryId: Number(this.newTask.userStoryId),
    };

    this.loading = true;
    this.error = null;

    this.taskService.updateTask(this.editingTaskId, payload).subscribe({
      next: () => {
        this.successMessage = 'Task updated successfully!';
        this.loadTasks();
        this.resetForm();
        this.showCreateTaskForm = false;
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => (this.successMessage = null), 3000);
      },
      error: (err) => {
        this.error = 'Failed to update task: ' + (err.error?.message || err.message);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteTask(taskId: number): void {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.taskService.deleteTask(taskId).subscribe({
      next: () => {
        this.successMessage = 'Task deleted successfully!';
        this.loadTasks();
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => (this.successMessage = null), 3000);
      },
      error: (err) => {
        this.error = 'Failed to delete task: ' + (err.error?.message || err.message);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  moveTask(task: Task, targetState: State): void {
    if (task.taskState === targetState) {
      return;
    }

    const payload: UpdateTaskDto = {
      id: task.id,
      name: task.name,
      description: task.description,
      estimationDuration: task.estimationDuration,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate),
      taskState: targetState,
      complexity: task.complexity,
      userStoryId: task.userStoryId,
    };

    this.taskService.updateTask(task.id, payload).subscribe({
      next: () => {
        task.taskState = targetState;
        this.successMessage = 'Task status updated!';
        this.cdr.detectChanges();
        setTimeout(() => (this.successMessage = null), 1500);
      },
      error: (err) => {
        this.error = 'Failed to update task status: ' + (err.error?.message || err.message);
        this.cdr.detectChanges();
      },
    });
  }

  moveToPrevious(task: Task): void {
    const currentIndex = this.orderedStates.indexOf(task.taskState);
    if (currentIndex <= 0) {
      return;
    }
    this.moveTask(task, this.orderedStates[currentIndex - 1]);
  }

  moveToNext(task: Task): void {
    const currentIndex = this.orderedStates.indexOf(task.taskState);
    if (currentIndex === -1 || currentIndex >= this.orderedStates.length - 1) {
      return;
    }
    this.moveTask(task, this.orderedStates[currentIndex + 1]);
  }

  canMovePrevious(task: Task): boolean {
    return this.orderedStates.indexOf(task.taskState) > 0;
  }

  canMoveNext(task: Task): boolean {
    const currentIndex = this.orderedStates.indexOf(task.taskState);
    return currentIndex !== -1 && currentIndex < this.orderedStates.length - 1;
  }

  getTasksByState(state: State): Task[] {
    return this.tasks.filter((task) => Number(task.taskState) === Number(state));
  }

  getStateLabel(state: State): string {
    return this.stateOptions.find((opt) => opt.value === state)?.label ?? 'Unknown';
  }

  getUserStoryName(userStoryId: number): string {
    return this.userStories.find((u) => u.id === userStoryId)?.name ?? 'N/A';
  }

  getSprintName(sprintId?: number | null): string {
    if (!sprintId) {
      return 'No sprint';
    }
    return this.sprints.find((s) => s.id === sprintId)?.name ?? 'No sprint';
  }

  validateForm(): boolean {
    if (!this.newTask.name || this.newTask.name.trim() === '') {
      this.error = 'Task name is required';
      return false;
    }

    if (!this.newTask.userStoryId || this.newTask.userStoryId === 0) {
      this.error = 'User Story is required';
      return false;
    }

    const startDate = new Date(this.newTask.startDate);
    const endDate = new Date(this.newTask.endDate);
    if (startDate >= endDate) {
      this.error = 'End date must be after start date';
      return false;
    }

    if (this.newTask.complexity < 1 || this.newTask.complexity > 5) {
      this.error = 'Complexity must be between 1 and 5';
      return false;
    }

    return true;
  }

  onTaskDatesChange(): void {
    if (!this.newTask.startDate || !this.newTask.endDate) {
      return;
    }

    const startDate = new Date(this.newTask.startDate);
    const endDate = new Date(this.newTask.endDate);

    if (startDate < endDate) {
      this.newTask.estimationDuration = this.calculateDurationInDays(startDate, endDate);
    }
  }

  calculateDurationInDays(startDate: Date, endDate: Date): number {
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  resetForm(): void {
    this.isEditMode = false;
    this.editingTaskId = null;
    this.error = null;

    this.newTask = {
      name: '',
      description: '',
      estimationDuration: 0,
      startDate: this.formatDateForInput(new Date()),
      endDate: this.formatDateForInput(new Date()),
      taskState: State.todo,
      complexity: 1,
      userStoryId: 0,
    };
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  trackByTaskId(_: number, task: Task): number {
    return task.id;
  }

  onDragStart(task: Task): void {
    this.draggedTask = task;
  }

  onDragEnd(): void {
    this.draggedTask = null;
  }

  onAllowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  onDropToState(event: DragEvent, targetState: State): void {
    event.preventDefault();

    if (!this.draggedTask) {
      return;
    }

    this.moveTask(this.draggedTask, targetState);
    this.draggedTask = null;
  }

}
