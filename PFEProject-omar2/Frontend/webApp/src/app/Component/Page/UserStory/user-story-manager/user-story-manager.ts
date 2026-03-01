import { Component, OnInit } from '@angular/core';
import { UserStoryService } from '../Service/UserStoryService';
import { ActivatedRoute, Router } from '@angular/router';
import { UserStoryDto, UserStoryStatus } from '../Model/userstory.model';
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
  State = UserStoryStatus;
  constructor(
    private userStoryService: UserStoryService,
    private route: Router,
    private activatedRoute: ActivatedRoute,
  ) { }
    ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      this.sprintId = params['sprintId'];
      if (this.sprintId) {
        this.loadUserStories();
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
    this.route.navigate(['/userstory/create', this.sprintId]);
  }

  editUserStory(id: string, event: Event): void {
    event.stopPropagation();
    this.route.navigate(['/userstory/edit', id]);
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

}