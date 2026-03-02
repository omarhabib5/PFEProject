import { Component, OnInit } from '@angular/core';
import { UserStoryService } from '../Service/UserStoryService';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateUserStoryRequest, UserStoryDto, UserStoryStatus } from '../Models/userstory.model';
import { NgIf, NgForOf } from '@angular/common';
import { finalize, timeout } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-story-manager',
  standalone: true,
  imports: [NgIf, NgForOf, FormsModule],
  templateUrl: './user-story-manager.html',
  styleUrl: './user-story-manager.css',
})
export class UserStoryManagerComponent implements OnInit {
  userStories: UserStoryDto[] = [];
  sprintId: number | null = null;
  loading: boolean = false;
  error: string = '';
  showCreateForm = false;
  createSubmitting = false;
  State = UserStoryStatus;
  createForm: CreateUserStoryRequest = {
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
    this.activatedRoute.params.subscribe(params => {
      const sprintIdParam = Number(params['sprintId']);
      this.sprintId = Number.isFinite(sprintIdParam) && sprintIdParam > 0 ? sprintIdParam : null;
      if (this.sprintId !== null) {
        this.createForm.sprintId = this.sprintId;
        this.loadUserStories();
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
        [UserStoryStatus.PENDING]: 'status-todo',
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
    if (this.sprintId === null) {
      this.error = 'Sprint invalide pour créer une user story';
      return;
    }

    this.showCreateForm = !this.showCreateForm;
    if (this.showCreateForm) {
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

    const payload: CreateUserStoryRequest = {
      title,
      description: this.createForm.description || '',
      acceptanceCriteria: this.createForm.acceptanceCriteria || '',
      storyPoints,
      priority,
      sprintId: this.sprintId,
    };

    this.error = '';
    this.createSubmitting = true;

    this.userStoryService.create(payload)
      .pipe(finalize(() => {
        this.createSubmitting = false;
      }))
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

  editUserStory(id: number, event: Event): void {
    event.stopPropagation();

    const story = this.userStories.find(item => item.id === id);
    if (!story) {
      return;
    }

    const title = window.prompt('Titre de la user story :', story.title);
    if (!title?.trim()) {
      return;
    }

    const description = window.prompt('Description :', story.description) ?? story.description;
    const acceptanceCriteria = window.prompt('Critères d\'acceptation :', story.acceptanceCriteria) ?? story.acceptanceCriteria;
    const storyPoints = Number(window.prompt('Story points :', String(story.storyPoints)) ?? String(story.storyPoints));
    const priority = Number(window.prompt('Priorité (1-5) :', String(story.priority)) ?? String(story.priority));

    if (!this.isValidNumber(storyPoints, 1) || !this.isValidNumber(priority, 1, 5)) {
      this.error = 'Story points ou priorité invalide';
      return;
    }

    this.userStoryService.update(id, {
      id,
      title: title.trim(),
      description,
      acceptanceCriteria,
      storyPoints,
      priority,
      assignedToId: story.assignedToId
    }).subscribe({
      next: () => this.loadUserStories(),
      error: (err) => {
        this.error = 'Erreur lors de la mise à jour de la user story';
        console.error(err);
      }
    });
  }

  deleteUserStory(id: number, event: Event): void {
    event.stopPropagation();

    if (confirm('Êtes-vous sûr de vouloir supprimer cette user story et toutes ses tâches ?')) {
      this.userStoryService.delete(id).subscribe({
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

  private isValidNumber(value: number, min: number, max?: number): boolean {
    if (Number.isNaN(value) || value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
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

}