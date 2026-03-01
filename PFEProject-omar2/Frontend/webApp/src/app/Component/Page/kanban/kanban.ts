import { CommonModule } from '@angular/common';
import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { AuthService } from '../../Auth/Service/auth.service';
import { TaskDto, TaskService, TaskState, UpdateTaskRequest } from '../Task/Service/TaskService';
import { UserStoryService } from '../UserStory/Service/UserStoryService';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, DragDropModule, RouterModule],
  templateUrl: './kanban.html',
  styleUrl: './kanban.css'
})

export class KanbanComponent implements OnInit {
  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private taskService: TaskService,
    private userStoryService: UserStoryService,
    private cdr: ChangeDetectorRef
  ) {}

  columns: BoardColumn[] = [
    {
      id: 'pending',
      title: 'Pending',
      tasks: []
    },
    {
      id: 'todo',
      title: 'To Do',
      tasks: []
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      tasks: []
    },
    {
      id: 'done',
      title: 'Done',
      tasks: []
    },
    {
      id: 'validated',
      title: 'Validated',
      tasks: []
    }
  ];

  loading = false;
  error = '';
  userStoryNameMap: Record<number, string> = {};
  projectId: number | null = null;

  ngOnInit(): void {
    const projectIdParam = this.route.snapshot.queryParamMap.get('projectId');
    this.projectId = projectIdParam ? Number(projectIdParam) : null;

    this.loadUserStories();
    this.loadTasks();
  }

  goToProjectDetails(): void {
    const queryParams = this.projectId && !Number.isNaN(this.projectId)
      ? { projectId: this.projectId, detailTab: 'overview' }
      : { detailTab: 'overview' };

    this.router.navigate(['/ProjectManage'], { queryParams });
  }

  getUserStoryLabel(userStoryId: number): string {
    return this.userStoryNameMap[userStoryId] ?? `US #${userStoryId}`;
  }

  get connectedIds(): string[] {
    return this.columns.map((column) => column.id);
  }

  addTask(column: BoardColumn): void {
    this.router.navigate(['/TaskManage'], {
      queryParams: { status: column.id }
    });
  }

  drop(event: CdkDragDrop<TaskDto[]>, targetColumn: BoardColumn): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const movedTask = event.previousContainer.data[event.previousIndex];
    if (!movedTask) {
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    const normalizedStatus = this.columnIdToStatus(targetColumn.id);
    const previousStatus = this.normalizeTaskStatus(movedTask.status);
    movedTask.status = normalizedStatus;

    const request: UpdateTaskRequest = {
      id: movedTask.id,
      title: movedTask.title,
      description: movedTask.description,
      estimatedHours: movedTask.estimatedHours,
      status: normalizedStatus,
      complexity: movedTask.complexity ?? 1,
      startDate: this.toDateInput(movedTask.startDate),
      endDate: this.toDateInput(movedTask.endDate),
      userStoryId: movedTask.userStoryId,
      assignedToId: movedTask.assignedToId ?? null,
      sprintId: movedTask.sprintId ?? null
    };

    this.taskService.update(request).subscribe({
      error: () => {
        movedTask.status = previousStatus;
        this.loadTasks();
        this.error = 'Failed to update task status.';
        this.cdr.detectChanges();
      }
    });
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


  private loadTasks(): void {
    this.loading = true;
    this.error = '';

    this.taskService.getAll().subscribe({
      next: (tasks) => {
        this.columns.forEach((column) => (column.tasks = []));
            this.cdr.detectChanges();

        tasks.forEach((task) => {
          const taskStatus = this.normalizeTaskStatus(task.status);
          const column = this.columns.find((item) => this.columnIdToStatus(item.id) === taskStatus);
          if (column) {
            column.tasks.push(task);
                this.cdr.detectChanges();
          }
        });

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load tasks.';
            this.cdr.detectChanges();
      }
    });
  }

  private loadUserStories(): void {
    this.userStoryService.getAllUserStories().subscribe({
      next: (stories) => {
        this.userStoryNameMap = stories.reduce((acc, story) => {
          const storyId = Number(story.id);
          if (!Number.isNaN(storyId)) {
            acc[storyId] = story.name || story.title || `US #${storyId}`;
          }
          return acc;
        }, {} as Record<number, string>);

        this.cdr.detectChanges();
      },
      error: () => {
        this.userStoryNameMap = {};
      }
    });
  }

  private columnIdToStatus(columnId: string): TaskState {
    const map: Record<string, TaskState> = {
      pending: 'pending',
      todo: 'todo',
      'in-progress': 'inProgress',
      done: 'done',
      validated: 'validated'
    };

    return map[columnId] ?? 'pending';
  }

  private normalizeTaskStatus(status: TaskState): TaskState {
    const mapByNumber: Record<number, TaskState> = {
      0: 'pending',
      1: 'todo',
      2: 'inProgress',
      3: 'done',
      4: 'validated'
    };

    if (typeof status === 'number') {
      return mapByNumber[status] ?? 'pending';
    }

    if (String(status) === 'inprogress') {
      return 'inProgress';
    }

    return status;
  }

  private toDateInput(value?: string): string {
    if (!value) {
      return new Date().toISOString().slice(0, 10);
    }

    return value.slice(0, 10);
  }
}

interface BoardColumn {
  id: string;
  title: string;
  tasks: TaskDto[];
}