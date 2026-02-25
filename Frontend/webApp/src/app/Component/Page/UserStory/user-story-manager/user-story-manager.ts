import { Component, OnInit } from '@angular/core';
import { UserStoryService } from '../Service/UserStoryService';
import { ActivatedRoute, Router } from '@angular/router';
import { UserStoryDto, UserStoryStatus } from '../Models/userstory.model';
import { NgIf, NgForOf } from '@angular/common';

@Component({
  selector: 'app-user-story-manager',
  imports: [NgIf, NgForOf],
  templateUrl: './user-story-manager.html',
  styleUrl: './user-story-manager.css',
})
export class UserStoryManagerComponent implements OnInit {
  userStories: UserStoryDto[] = [];
  sprintId: string = '';
  loading: boolean = false;
  error: string = '';
  processingAction = false;
  State = UserStoryStatus;
  constructor(
    private userStoryService: UserStoryService,
    private route: Router,
    private activatedRoute: ActivatedRoute,
  ) { }
    ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      this.sprintId = params['sprintId'] ?? this.sprintId;
      if (this.sprintId) {
        this.loadUserStories();
      }
    });

    this.activatedRoute.queryParams.subscribe(query => {
      const editId = query['editId'];
      if (editId && !this.processingAction) {
        this.processingAction = true;
        this.openEditDialog(editId).finally(() => {
          this.processingAction = false;
          this.route.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: { editId: null },
            queryParamsHandling: 'merge'
          });
        });
      }
    });
  }
  loadUserStories(): void {
    this.loading = true;
    this.error = '';
        this.userStoryService.getBySprintId(this.sprintId).subscribe({
      next: (data) => {
        this.userStories = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des user stories';
        this.loading = false;
        console.error(err);
      }
    });}
    getStatuLLabel(status: UserStoryStatus): string {
      const labels: Record<UserStoryStatus, string> = {
        [UserStoryStatus.TODO]: 'À faire',
        [UserStoryStatus.IN_PROGRESS]: 'En cours',
        [UserStoryStatus.REVIEW]: 'En revue',
        [UserStoryStatus.TESTING]: 'En test',
        [UserStoryStatus.DONE]: 'Terminé'
      };
      return labels[status] || 'Inconnu';
    }
    getStatusClass(status: UserStoryStatus): string {
      const classes: Record<UserStoryStatus, string> = {
        [UserStoryStatus.TODO]: 'status-todo',
        [UserStoryStatus.IN_PROGRESS]: 'status-in-progress',
        [UserStoryStatus.REVIEW]: 'status-review',
        [UserStoryStatus.TESTING]: 'status-testing',
        [UserStoryStatus.DONE]: 'status-done'
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
    const title = window.prompt('Titre de la user story :');
    if (!title?.trim()) return;

    const description = window.prompt('Description :', '') ?? '';
    const acceptanceCriteria = window.prompt('Critères d\'acceptation :', '') ?? '';
    const storyPointsInput = window.prompt('Story points (nombre) :', '1') ?? '1';
    const priorityInput = window.prompt('Priorité (1-5) :', '3') ?? '3';

    const storyPoints = Number(storyPointsInput);
    const priority = Number(priorityInput);

    if (!this.isValidNumber(storyPoints, 1) || !this.isValidNumber(priority, 1, 5)) {
      alert('Story points ou priorité invalide');
      return;
    }

    this.userStoryService.create({
      title: title.trim(),
      description,
      acceptanceCriteria,
      storyPoints,
      priority,
      sprintId: this.sprintId
    }).subscribe({
      next: () => this.loadUserStories(),
      error: (err) => {
        alert('Erreur lors de la création de la user story');
        console.error(err);
      }
    });
  }

  editUserStory(id: string, event: Event): void {
    event.stopPropagation();
    this.openEditDialog(id);
  }
  deleteUserStory(id: string, event: Event): void {
    event.stopPropagation();
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cette user story et toutes ses tâches ?')) {
      this.userStoryService.delete(id).subscribe({
        next: () => {
          this.loadUserStories();
        },
        error: (err) => {
          alert('Erreur lors de la suppression');
          console.error(err);
        }
      });
    }}
    goBack(): void {
    this.route.navigate(['/sprint/view', this.sprintId]);
  }

  private async openEditDialog(id: string): Promise<void> {
    const story = this.userStories.find(s => s.id === id);
    if (!story) {
      this.userStoryService.getById(id).subscribe({
        next: (loaded) => this.submitEdit(loaded.id, loaded.title, loaded.description, loaded.acceptanceCriteria, loaded.storyPoints, loaded.priority),
        error: (err) => {
          alert('Impossible de charger la user story à modifier');
          console.error(err);
        }
      });
      return;
    }

    this.submitEdit(story.id, story.title, story.description, story.acceptanceCriteria, story.storyPoints, story.priority);
  }

  private submitEdit(id: string, initialTitle: string, initialDescription: string, initialAcceptance: string, initialStoryPoints: number, initialPriority: number): void {
    const title = window.prompt('Titre de la user story :', initialTitle);
    if (!title?.trim()) return;

    const description = window.prompt('Description :', initialDescription) ?? initialDescription;
    const acceptanceCriteria = window.prompt('Critères d\'acceptation :', initialAcceptance) ?? initialAcceptance;
    const storyPointsInput = window.prompt('Story points (nombre) :', String(initialStoryPoints)) ?? String(initialStoryPoints);
    const priorityInput = window.prompt('Priorité (1-5) :', String(initialPriority)) ?? String(initialPriority);

    const storyPoints = Number(storyPointsInput);
    const priority = Number(priorityInput);

    if (!this.isValidNumber(storyPoints, 1) || !this.isValidNumber(priority, 1, 5)) {
      alert('Story points ou priorité invalide');
      return;
    }

    this.userStoryService.update(id, {
      id,
      title: title.trim(),
      description,
      acceptanceCriteria,
      storyPoints,
      priority
    }).subscribe({
      next: () => this.loadUserStories(),
      error: (err) => {
        alert('Erreur lors de la mise à jour de la user story');
        console.error(err);
      }
    });
  }

  private isValidNumber(value: number, min: number, max?: number): boolean {
    if (Number.isNaN(value) || value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  }

}