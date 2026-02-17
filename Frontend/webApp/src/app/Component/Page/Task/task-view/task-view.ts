import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TaskDto, TaskService, TaskState } from '../Service/TaskService';

@Component({
  selector: 'app-task-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './task-view.html',
  styleUrl: './task-view.css',
})
export class TaskView implements OnInit {
  task: TaskDto | null = null;
  loading = true;
  error = '';

  constructor(
    private taskService: TaskService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const taskId = Number(params['id']);
      if (!taskId) {
        this.error = 'ID de tâche invalide';
        this.loading = false;
        return;
      }
      this.loadTask(taskId);
    });
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
        this.error = 'Erreur lors du chargement de la tâche';
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
      next: () => this.router.navigate(['/task/manage']),
      error: () => this.error = 'Erreur lors de la suppression de la tâche'
    });
  }

  goBack(): void {
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

}
