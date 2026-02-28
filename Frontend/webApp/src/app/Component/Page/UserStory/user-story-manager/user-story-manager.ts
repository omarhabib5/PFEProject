import { Component, OnInit } from '@angular/core';
import { DatePipe, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { UserStoryDto, UserStoryStatus } from '../Models/userstory.model';
import { UserStoryService } from '../Service/UserStoryService';
import { SprintService } from '../../Sprint/Service/SprintService';
import { UserApiService, UserDto } from '../../Team/Service/UserApiService';

@Component({
  selector: 'app-user-story-manager',
  standalone: true,
  imports: [NgIf, NgForOf, FormsModule, DatePipe],
  templateUrl: './user-story-manager.html',
  styleUrl: './user-story-manager.css',
})
export class UserStoryManagerComponent implements OnInit {
  userStories: UserStoryDto[] = [];
  users: UserDto[] = [];
  sprintId: number | null = null;
  projectId: number | null = null;
  loading = false;
  submitting = false;
  error = '';
  processingAction = false;
  showStoryForm = false;
  isEditMode = false;
  editingStoryId: number | null = null;
  State = UserStoryStatus;

  storyForm = {
    title: '',
    description: '',
    acceptanceCriteria: '',
    storyPoints: 1,
    priority: 3,
    assignedToId: null as number | null
  };

  constructor(
    private userStoryService: UserStoryService,
    private sprintService: SprintService,
    private userApiService: UserApiService,
    private route: Router,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      const sprintIdParam = Number(params['sprintId']);
      this.sprintId = Number.isFinite(sprintIdParam) && sprintIdParam > 0 ? sprintIdParam : this.sprintId;
      this.tryLoadFromContext();
    });

    this.activatedRoute.queryParams.subscribe(query => {
      const projectIdParam = Number(query['projectId']);
      this.projectId = Number.isFinite(projectIdParam) && projectIdParam > 0 ? projectIdParam : this.projectId;

      const editId = Number(query['editId']);
      if (editId && !this.processingAction) {
        this.processingAction = true;
        this.openEditForm(editId).finally(() => {
          this.processingAction = false;
          this.route.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: { editId: null },
            queryParamsHandling: 'merge'
          });
        });
      }

      this.tryLoadFromContext();
    });

    this.loadUsers();
  }

  private tryLoadFromContext(): void {
    if (this.sprintId !== null) {
      this.loadUserStories();
      return;
    }

    if (this.projectId !== null) {
      this.resolveSprintFromProject(this.projectId);
      return;
    }

    this.error = 'Aucun sprint sélectionné. Ouvrez les user stories depuis un sprint ou un projet.';
  }

  private resolveSprintFromProject(projectId: number): void {
    this.loading = true;
    this.error = '';

    this.sprintService.getSprintsByProjectId(projectId)
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (sprints) => {
          const firstSprintId = sprints?.[0]?.id;
          if (!firstSprintId) {
            this.error = 'Aucun sprint trouvé pour ce projet. Créez un sprint d\'abord.';
            return;
          }

          this.sprintId = firstSprintId;
          this.loadUserStories();
        },
        error: () => {
          this.error = 'Impossible de charger les sprints du projet.';
        }
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

  private loadUsers(): void {
    this.userApiService.getUsers()
      .pipe(timeout(10000))
      .subscribe({
        next: (users) => {
          this.users = users ?? [];
        },
        error: () => {
          this.users = [];
        }
      });
  }

  getStatusLabel(status: UserStoryStatus): string {
    const labels: Record<UserStoryStatus, string> = {
      [UserStoryStatus.PENDING]: 'En attente',
      [UserStoryStatus.TODO]: 'À faire',
      [UserStoryStatus.IN_PROGRESS]: 'En cours',
      [UserStoryStatus.DONE]: 'Terminé',
      [UserStoryStatus.VALIDATED]: 'Validé'
    };
    return labels[status] || 'Inconnu';
  }

  getStatusClass(status: UserStoryStatus): string {
    const classes: Record<UserStoryStatus, string> = {
      [UserStoryStatus.PENDING]: 'status-pending',
      [UserStoryStatus.TODO]: 'status-todo',
      [UserStoryStatus.IN_PROGRESS]: 'status-inprogress',
      [UserStoryStatus.DONE]: 'status-done',
      [UserStoryStatus.VALIDATED]: 'status-done'
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

  viewUserStory(id: number): void {
    this.route.navigate(['/userstory/view', id]);
  }

  createUserStory(): void {
    this.openCreateForm();
  }

  openCreateForm(): void {
    this.error = '';
    this.showStoryForm = true;
    this.isEditMode = false;
    this.editingStoryId = null;
    this.storyForm = {
      title: '',
      description: '',
      acceptanceCriteria: '',
      storyPoints: 1,
      priority: 3,
      assignedToId: null
    };
  }

  cancelStoryForm(): void {
    this.showStoryForm = false;
    this.isEditMode = false;
    this.editingStoryId = null;
    this.submitting = false;
  }

  saveUserStory(): void {
    if (this.sprintId === null) {
      this.error = 'Sprint invalide pour créer une user story';
      return;
    }

    const title = this.storyForm.title.trim();
    const description = this.storyForm.description.trim();
    const acceptanceCriteria = this.storyForm.acceptanceCriteria.trim();
    const storyPoints = Number(this.storyForm.storyPoints);
    const priority = Number(this.storyForm.priority);
    const assignedToId = this.storyForm.assignedToId ?? undefined;

    if (!title) {
      this.error = 'Le titre est obligatoire';
      return;
    }

    if (!this.isValidNumber(storyPoints, 1) || !this.isValidNumber(priority, 1, 5)) {
      this.error = 'Story points ou priorité invalide';
      return;
    }

    this.submitting = true;
    this.error = '';

    if (this.isEditMode && this.editingStoryId !== null) {
      this.userStoryService.update(this.editingStoryId, {
        id: this.editingStoryId,
        title,
        description,
        acceptanceCriteria,
        storyPoints,
        priority,
        assignedToId
      })
      .pipe(
        timeout(10000),
        finalize(() => {
          this.submitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.cancelStoryForm();
          this.loadUserStories();
        },
        error: (err) => {
          this.error = 'Erreur lors de la mise à jour de la user story';
          console.error(err);
        }
      });
      return;
    }

    this.userStoryService.create({
      title,
      description,
      acceptanceCriteria,
      storyPoints,
      priority,
      sprintId: this.sprintId,
      assignedToId
    })
    .pipe(
      timeout(10000),
      finalize(() => {
        this.submitting = false;
      })
    )
    .subscribe({
      next: () => {
        this.cancelStoryForm();
        this.loadUserStories();
      },
      error: (err) => {
        this.error = 'Erreur lors de la création de la user story';
        console.error(err);
      }
    });
  }

  editUserStory(id: number, event: Event): void {
    event.stopPropagation();
    this.openEditForm(id);
  }

  deleteUserStory(id: number, event: Event): void {
    event.stopPropagation();

    if (confirm('Êtes-vous sûr de vouloir supprimer cette user story et toutes ses tâches ?')) {
      this.submitting = true;
      this.userStoryService.delete(id)
        .pipe(
          timeout(10000),
          finalize(() => {
            this.submitting = false;
          })
        )
        .subscribe({
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
    this.route.navigate(['/sprint/view', this.sprintId]);
  }

  private async openEditForm(id: number): Promise<void> {
    const story = this.userStories.find(s => s.id === id);
    if (!story) {
      this.userStoryService.getById(id)
      .pipe(timeout(10000))
      .subscribe({
        next: (loaded) => {
          this.prefillForm(loaded.id, loaded.title, loaded.description, loaded.acceptanceCriteria, loaded.storyPoints, loaded.priority, loaded.assignedToId);
        },
        error: (err) => {
          this.error = 'Impossible de charger la user story à modifier';
          console.error(err);
        }
      });
      return;
    }

    this.prefillForm(story.id, story.title, story.description, story.acceptanceCriteria, story.storyPoints, story.priority, story.assignedToId);
  }

  private prefillForm(id: number, title: string, description: string, acceptanceCriteria: string, storyPoints: number, priority: number, assignedToId?: number): void {
    this.error = '';
    this.showStoryForm = true;
    this.isEditMode = true;
    this.editingStoryId = id;
    this.storyForm = {
      title,
      description,
      acceptanceCriteria,
      storyPoints,
      priority,
      assignedToId: assignedToId ?? null
    };
  }

  private isValidNumber(value: number, min: number, max?: number): boolean {
    if (Number.isNaN(value) || value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  }
}