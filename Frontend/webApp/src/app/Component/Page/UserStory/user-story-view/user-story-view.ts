import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { TaskDto, UserStoryDetailDto, UserStoryStatus } from '../Models/userstory.model';
import { UserStoryService } from '../Service/UserStoryService';
import { TaskService } from '../../Task/Service/TaskService';

@Component({
  selector: 'app-user-story-view',
  standalone: true,
  imports: [CommonModule,RouterModule],
  templateUrl: './user-story-view.html',
  styleUrl: './user-story-view.css',
})
export class UserStoryViewComponent implements OnInit { 
  userStory: UserStoryDetailDto | null = null;
  loading: boolean = true;
  error: string = '';
  State = UserStoryStatus;

  statuses=[
    { value: UserStoryStatus.PENDING, label: 'En attente', icon: '🕒' },
    { value: UserStoryStatus.TODO, label: 'À faire', icon: '📋' },
    { value: UserStoryStatus.IN_PROGRESS, label: 'En cours', icon: '⚡' },
    { value: UserStoryStatus.DONE, label: 'Terminé', icon: '✅' },
    { value: UserStoryStatus.VALIDATED, label: 'Validé', icon: '✔️' }
  ];
  
  constructor(
    private userStoryService: UserStoryService,
    private taskService: TaskService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = Number(params['id']);
      if (Number.isFinite(id) && id > 0) {
        this.loadUserStory(id);
        return;
      }

      this.loading = false;
      this.error = 'Identifiant de user story invalide.';
    });
  }

  loadUserStory(id: number): void {
    this.loading = true;
    this.error = '';

    this.userStoryService.getById(id)
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (data) => {
          this.userStory = data;
        },
        error: (err) => {
          this.error = 'Erreur lors du chargement de la user story';
          console.error(err);
        }
      });

  }

  getStatusLabel(status: UserStoryStatus): string {
    const found = this.statuses.find(s => s.value === status);
    return found ? found.label : 'Inconnu';
  }

  getStatusIcon(status: UserStoryStatus): string {
    const found = this.statuses.find(s => s.value === status);
    return found ? found.icon : '❓';
  }

  getStatusClass(status: UserStoryStatus): string {
    const classes: Record<UserStoryStatus, string> = {
      [UserStoryStatus.PENDING]: 'status-todo',
      [UserStoryStatus.TODO]: 'status-todo',
      [UserStoryStatus.IN_PROGRESS]: 'status-inprogress',
      [UserStoryStatus.DONE]: 'status-done',
      [UserStoryStatus.VALIDATED]: 'status-done'
    };
    return classes[status] || '';
  }

  getPriorityLabel(priority: number): string {
    const labels: Record<number, string> = {
      1: 'Critique',
      2: 'Élevée',
      3: 'Moyenne',
      4: 'Basse',
      5: 'Très basse'
    };
    return labels[priority] || 'N/A';
  }

  changeStatus(newStatus: UserStoryStatus): void {
    if (!this.userStory) return;

    const userStoryId = this.userStory.id;
    this.userStoryService.updateStatus(userStoryId, newStatus)
      .pipe(timeout(10000))
      .subscribe({
        next: () => {
          this.loadUserStory(userStoryId);
        },
        error: (err) => {
          alert('Erreur lors du changement de statut');
          console.error(err);
        }
      });
  }

  changeTaskStatus(task: TaskDto, newStatus: UserStoryStatus): void {
    if (!this.userStory) return;

    const userStoryId = this.userStory.id;
    this.taskService.updateStatus(task.id, newStatus)
      .pipe(timeout(10000))
      .subscribe({
        next: () => {
          this.loadUserStory(userStoryId);
        },
        error: (err) => {
          alert('Erreur lors du changement de statut de la tâche');
          console.error(err);
        }
      });
  }

  onTaskStatusChange(task: TaskDto, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedStatus = Number(target.value) as UserStoryStatus;

    if (Object.values(UserStoryStatus).includes(selectedStatus)) {
      this.changeTaskStatus(task, selectedStatus);
    }
  }

  getCompletedTasksCount(): number {
    if (!this.userStory) return 0;
    return this.userStory.tasks.filter(t => t.status === UserStoryStatus.DONE).length;
  }

  getTotalEstimatedHours(): number {
    if (!this.userStory) return 0;
    return this.userStory.tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
  }

  getTotalActualHours(): number {
    if (!this.userStory) return 0;
    return this.userStory.tasks.reduce((sum, task) => sum + task.actualHours, 0);
  }

  getCompletionPercentage(): number {
    if (!this.userStory || this.userStory.tasks.length === 0) return 0;
    const completed = this.userStory.tasks.filter(t => t.status === UserStoryStatus.DONE).length;
    return Math.round((completed / this.userStory.tasks.length) * 100);
  }

  editUserStory(): void {
    if (this.userStory) {
      this.router.navigate(['/userstory/manage', this.userStory.sprintId], {
        queryParams: { editId: this.userStory.id }
      });
    }
  }

  createTask(): void {
    if (this.userStory) {
      this.router.navigate(['/task/manage', this.userStory.id]);
    }
  }

  viewTask(taskId: number): void {
    this.router.navigate(['/task/view', taskId]);
  }

  goBack(): void {
    if (this.userStory) {
      this.router.navigate(['/userstory/manage', this.userStory.sprintId]);
    } else {
      this.router.navigate(['/']);
    }
  }
}
