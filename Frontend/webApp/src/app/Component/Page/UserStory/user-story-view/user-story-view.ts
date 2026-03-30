import { Component, OnInit } from '@angular/core';
import { UserStoryService } from '../Service/UserStoryService';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateUserStoryRequest, UserStoryDto, UserStoryStatus } from '../Models/userstory.model';
import { NgIf, NgForOf } from '@angular/common';
import { finalize, timeout } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-story-view',
  standalone: true,
  imports: [NgIf, NgForOf, FormsModule],
  templateUrl: './user-story-view.html',
  styleUrl: './user-story-view.css',
})
export class UserStoryViewComponent implements OnInit {
  userStories: UserStoryDto[] = [];
  sprintId: number | null = null;
  projectId: number | null = null;
  userStoryId: number | null = null;
  loading: boolean = false;
  error: string = '';
  createSubmitting = false;
  showCreateForm = false;
  State = UserStoryStatus;
  createForm: {
    title: string;
    description: string;
    acceptanceCriteria: string;
    storyPoints: number;
    priority: number;
    sprintId: number;
  } = {
    title: '',
    description: '',
    acceptanceCriteria: '',
    storyPoints: 1,
    priority: 3,
    sprintId: 0,
  };

  constructor(
    private userStoryService: UserStoryService,
    private route: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParamMap.subscribe(queryParams => {
      const sprintIdParam = Number(queryParams.get('sprintId'));
      const projectIdParam = Number(queryParams.get('projectId'));

      this.sprintId = Number.isFinite(sprintIdParam) && sprintIdParam > 0 ? sprintIdParam : null;
      this.projectId = Number.isFinite(projectIdParam) && projectIdParam > 0 ? projectIdParam : null;
      this.createForm.sprintId = this.sprintId ?? 0;

      this.activatedRoute.paramMap.subscribe(routeParams => {
        const userStoryIdParam = Number(routeParams.get('id'));
        this.userStoryId = Number.isFinite(userStoryIdParam) && userStoryIdParam > 0 ? userStoryIdParam : null;

        if (this.sprintId !== null) {
          this.loadUserStories();
          return;
        }

        if (this.userStoryId !== null) {
          this.loadUserStoryById(this.userStoryId);
          return;
        }

        this.userStories = [];
        this.error = 'Paramètres invalides pour afficher les user stories';
      });
    });
  }

  loadUserStories(): void {
    if (this.sprintId === null) {
      this.error = 'Sprint invalide pour charger les user stories';
      return;
    }

    this.loading = true;
    this.error = '';

    this.userStoryService.getBySprintId(this.sprintId)
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
      next: (data) => {
        this.userStories = data;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des user stories';
        console.error(err);
      }
      });
  }

  private loadUserStoryById(id: number): void {
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
        next: (story) => {
          this.sprintId = Number(story.sprintId);
          this.createForm.sprintId = Number(story.sprintId);
          this.userStories = [{
            name: story.title,
            id: story.id,
            title: story.title,
            description: story.description,
            acceptanceCriteria: story.acceptanceCriteria,
            storyPoints: story.storyPoints,
            priority: story.priority,
            status: story.status,
            sprintId: story.sprintId,
            assignedToId: story.assignedToId,
            assignedToName: story.assignedToName,
            taskCount: story.tasks?.length ?? 0,
            completedTaskCount: (story.tasks ?? []).filter(task =>
              task.status === UserStoryStatus.DONE
            ).length,
            createdAt: story.createdAt,
            updatedAt: story.updatedAt,
          }];
        },
        error: (err) => {
          this.error = 'Erreur lors du chargement de la user story';
          console.error(err);
        }
      });
  }

  getStatusLabel(status: UserStoryStatus): string {
      const labels: Record<UserStoryStatus, string> = {
        [UserStoryStatus.TODO]: 'À faire',
        [UserStoryStatus.IN_PROGRESS]: 'En cours',
        [UserStoryStatus.REVIEW]: 'Review',
        [UserStoryStatus.TESTING]: 'Testing',
        [UserStoryStatus.DONE]: 'Terminé',
      };
      return labels[status] || 'Inconnu';
  }

  getStatusClass(status: UserStoryStatus): string {
      const classes: Record<UserStoryStatus, string> = {
        [UserStoryStatus.TODO]: 'status-todo',
        [UserStoryStatus.IN_PROGRESS]: 'status-inprogress',
        [UserStoryStatus.REVIEW]: 'status-inprogress',
        [UserStoryStatus.TESTING]: 'status-inprogress',
        [UserStoryStatus.DONE]: 'status-done',
      };
      return classes[status] || '';
  }

  getProgress(userStory: UserStoryDto): number {
      if (userStory.taskCount === 0) {
        return 0;
      }
      return Math.round((userStory.completedTaskCount / userStory.taskCount) * 100);
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

  getPriorityClass(priority: number): string {
    const classes: Record<number, string> = {
      1: 'priority-critical',
      2: 'priority-high',
      3: 'priority-medium',
      4: 'priority-low',
      5: 'priority-verylow'
    };
    return classes[priority] || '';
  }

  viewUserStory(id: string): void {
    this.route.navigate(['/userstory/view', id]);
  }

  createUserStory(): void {
    this.showCreateForm = !this.showCreateForm;
    if (this.showCreateForm && this.sprintId !== null) {
      this.createForm.sprintId = this.sprintId;
    }
  }

  submitCreateUserStory(): void {
    if (this.sprintId === null) {
      this.error = 'Sprint invalide pour créer une user story';
      return;
    }

    const title = this.createForm.title?.trim();
    if (!title) {
      this.error = 'Le titre est obligatoire';
      return;
    }

    const storyPoints = Number(this.createForm.storyPoints);
    const priority = Number(this.createForm.priority);
    if (!this.isValidNumber(storyPoints, 1) || !this.isValidNumber(priority, 1, 5)) {
      this.error = 'Story points ou priorité invalide';
      return;
    }

    this.error = '';
    this.createSubmitting = true;

    const now = new Date();
    const payload: CreateUserStoryRequest = {
      name: title,
      title,
      description: this.createForm.description || '',
      acceptanceCriteria: this.createForm.acceptanceCriteria || '',
      storyPoints,
      priority,
      status: UserStoryStatus.TODO,
      startDate: now,
      endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      estimatedDuration: 1,
      userStoryState: 1,
      projectId: this.projectId ?? 0,
      sprintId: this.sprintId,
    };

    this.userStoryService.create(payload)
      .pipe(finalize(() => { this.createSubmitting = false; }))
      .subscribe({
        next: () => {
          this.resetCreateForm();
          this.showCreateForm = false;
          this.loadUserStories();
        },
        error: (err) => {
          this.error = 'Erreur lors de la création de la user story';
          console.error(err);
        }
      });
  }

  cancelCreate(): void {
    this.resetCreateForm();
    this.showCreateForm = false;
  }

  editUserStory(id: string, event: Event): void {
    event.stopPropagation();
    this.route.navigate(['/userstory/edit', id]);
  }

  deleteUserStory(id: string, event: Event): void {
    event.stopPropagation();

    if (confirm('Êtes-vous sûr de vouloir supprimer cette user story et toutes ses tâches ?')) {
      this.userStoryService.delete(Number(id)).subscribe({
        next: () => {
          this.loadUserStories();
        },
        error: (err) => {
          this.error = 'Erreur lors de la suppression';
          console.error(err);
        }
      });
    }
  }

  goBack(): void {
    const queryParams: { projectId?: number; detailTab?: string } = {};
    if (this.projectId !== null) {
      queryParams.projectId = this.projectId;
      queryParams.detailTab = 'stories';
    }

    this.route.navigate(['/ProjectManage'], { queryParams });
  }

  private resetCreateForm(): void {
    this.createForm = {
      title: '',
      description: '',
      acceptanceCriteria: '',
      storyPoints: 1,
      priority: 3,
      sprintId: this.sprintId ?? 0,
    };
  }

  private isValidNumber(value: number, min: number, max?: number): boolean {
    if (Number.isNaN(value) || value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  }

}