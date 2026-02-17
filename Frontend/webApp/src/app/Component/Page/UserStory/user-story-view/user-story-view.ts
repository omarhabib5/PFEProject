import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
    { value: UserStoryStatus.TODO, label: 'À faire', icon: '📋' },
    { value: UserStoryStatus.IN_PROGRESS, label: 'En cours', icon: '⚡' },
    { value: UserStoryStatus.REVIEW, label: 'En revue', icon: '👀' },
    { value: UserStoryStatus.DONE, label: 'Terminé', icon: '✅' },
    { value: UserStoryStatus.TESTING, label: 'En test', icon: '🧪' }
  ];
  
  constructor(
    private userStoryService: UserStoryService,
    @Inject(TaskService)
    private taskService: TaskService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadUserStory(id);
      }
    });
  }

  loadUserStory(id: string): void {
    this.loading = true;
    this.error = '';

    this.userStoryService.getById(id).subscribe({
      next: (data) => {
        this.userStory = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement de la user story';
        this.loading = false;
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
      [UserStoryStatus.TODO]: 'status-todo',
      [UserStoryStatus.IN_PROGRESS]: 'status-inprogress',
      [UserStoryStatus.REVIEW]: 'status-inreview',
      [UserStoryStatus.DONE]: 'status-done',
      [UserStoryStatus.TESTING]: 'status-testing'
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

    this.userStoryService.updateStatus(this.userStory.id, newStatus).subscribe({
      next: () => {
        this.loadUserStory(this.userStory!.id);
      },
      error: (err) => {
        alert('Erreur lors du changement de statut');
        console.error(err);
      }
    });
  }

  changeTaskStatus(task: TaskDto, newStatus: UserStoryStatus): void {
    this.taskService.updateStatus(task.id, newStatus).subscribe({
      next: () => {
        this.loadUserStory(this.userStory!.id);
      },
      error: (err) => {
        alert('Erreur lors du changement de statut de la tâche');
        console.error(err);
      }
    });
  }

  onTaskStatusChange(task: TaskDto, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedStatus = target.value as UserStoryStatus;

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
      this.router.navigate(['/userstory/edit', this.userStory.id]);
    }
  }

  createTask(): void {
    if (this.userStory) {
      this.router.navigate(['/task/create', this.userStory.id]);
    }
  }

  viewTask(taskId: string): void {
    this.router.navigate(['/task/view', taskId]);
  }

  goBack(): void {
    if (this.userStory) {
      this.router.navigate(['/sprint', this.userStory.sprintId, 'userstories']);
    } else {
      this.router.navigate(['/']);
    }
  }
}
