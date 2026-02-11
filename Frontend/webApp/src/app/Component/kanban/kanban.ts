import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { AuthService } from '../Auth/Service/auth.service';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, DragDropModule, RouterModule],
  templateUrl: './kanban.html',
  styleUrl: './kanban.css'
})
export class KanbanComponent {
  constructor(private auth: AuthService, private router: Router) {}

  columns: BoardColumn[] = [
    {
      id: 'todo',
      title: 'To Do',
      tasks: ['Define user stories', 'Create wireframes', 'Setup repo']
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      tasks: ['Implement auth flow', 'Design dashboard']
    },
    {
      id: 'review',
      title: 'Review',
      tasks: ['API contract review', 'UI accessibility check']
    },
    {
      id: 'testing',
      title: 'Testing',
      tasks: ['Login tests', 'Kanban layout tests']
    },
    {
      id: 'done',
      title: 'Done',
      tasks: ['Project setup', 'CI pipeline']
    }
  ];

  get connectedIds(): string[] {
    return this.columns.map((column) => column.id);
  }

  addTask(column: BoardColumn): void {
    const title = window.prompt('Enter task title');
    if (!title) {
      return;
    }
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    column.tasks.push(trimmed);
  }

  drop(event: CdkDragDrop<string[]>): void {
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
  }

  trackById(_: number, column: BoardColumn): string {
    return column.id;
  }

  trackByTask(_: number, task: string): string {
    return task;
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}

interface BoardColumn {
  id: string;
  title: string;
  tasks: string[];
}
