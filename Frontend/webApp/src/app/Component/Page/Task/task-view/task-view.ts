import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TaskDto, TaskService, TaskState } from '../Service/TaskService';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-task-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './task-view.html',
  styleUrl: './task-view.css',
})
export class TaskView implements OnInit, OnDestroy {
  task: TaskDto | null = null;
  loading = true;
  error = '';
  private autoRefreshSubscription: Subscription | null = null;
  private readonly autoRefreshMs = 15000;
  private currentTaskId: number | null = null;

  constructor(
    private taskService: TaskService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const taskId = Number(params['id']);
      if (!taskId) {
        this.error = 'Invalid task ID';
        this.loading = false;
        return;
      }
      this.currentTaskId = taskId;
      this.loadTask(taskId);
      this.startAutoRefresh();
    });
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadTask(id: number): void {
    this.loading = true;
    this.error = '';

    this.taskService.getById(id).subscribe({
      next: (data) => {
        this.task = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Error while loading the task';
        this.loading = false;
      }
    });
  }

  goToEdit(): void {
    if (!this.task) return;
    this.router.navigate(['/task/edit', this.task.id]);
  }

  deleteTask(): void {
    if (!this.task) return;
    this.taskService.delete(this.task.id).subscribe({
      next: () => this.goBack(),
      error: () => this.error = 'Error while deleting the task'
    });
  }

  goBack(): void {
    if (this.task?.userStoryId) {
      this.router.navigate(['/userstory/view', this.task.userStoryId]);
      return;
    }
    this.router.navigate(['/task/manage']);
  }

  getStatusLabel(status: TaskState): string {
    const values: Record<string, string> = {
      pending: 'Pending',
      todo: 'To Do',
      inProgress: 'In Progress',
      done: 'Done',
      validated: 'Validated',
      '0': 'Pending',
      '1': 'To Do',
      '2': 'In Progress',
      '3': 'Done',
      '4': 'Validated'
    };
    return values[String(status)] ?? String(status);
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshSubscription = interval(this.autoRefreshMs).subscribe(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      if (this.currentTaskId) {
        this.loadTask(this.currentTaskId);
      }
    });
  }

  private stopAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
    this.autoRefreshSubscription = null;
  }

}
