import { Component, OnInit } from '@angular/core';
import { UserStoryService } from '../Service/UserStoryService';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateUserStoryRequest, UpdateUserStoryRequest, UserStoryDto, UserStoryStatus, UserStoryStateValue } from '../Models/userstory.model';
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
  private loadingWatchdogId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private userStoryService: UserStoryService,
    private route: Router,
    private activatedRoute: ActivatedRoute,
  ) { }
  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      const sprintIdFromPath = Number(params['sprintId']);
      const sprintIdFromQuery = Number(this.activatedRoute.snapshot.queryParamMap.get('sprintId'));
      const sprintIdParam = Number.isFinite(sprintIdFromPath) && sprintIdFromPath > 0
        ? sprintIdFromPath
        : sprintIdFromQuery;

      this.sprintId = Number.isFinite(sprintIdParam) && sprintIdParam > 0 ? sprintIdParam : null;
      if (this.sprintId !== null) {
        this.createForm.sprintId = this.sprintId;
        this.loadUserStories();
      } else {
        this.loading = false;
        this.error = 'Sprint invalide pour charger les user stories';
      }
    });
  }

  loadUserStories(): void {
    if (this.sprintId === null) {
      this.error = 'Invalid sprint for loading user stories';
      return;
    }

    this.loading = true;
    this.error = '';
    this.startLoadingWatchdog();

    this.userStoryService.getBySprintId(this.sprintId)
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading = false;
          this.clearLoadingWatchdog();
        })
      )
      .subscribe({
      next: (data) => {
        this.userStories = data;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors du chargement des user stories';
        console.error(err);
      }
      });
  }

  getStatusLabel(status: UserStoryStateValue | undefined): string {
      const normalizedStatus = this.normalizeStatusValue(status);
      const labels: Record<string, string> = {
        '0': 'Pending',
        '1': 'To Do',
        '2': 'In Progress',
        '3': 'Done',
        '4': 'Validated',
        [UserStoryStatus.TODO]: 'To Do',
        [UserStoryStatus.IN_PROGRESS]: 'In Progress',
        [UserStoryStatus.REVIEW]: 'Review',
        [UserStoryStatus.TESTING]: 'Testing',
        [UserStoryStatus.DONE]: 'Done',
      };
      return labels[normalizedStatus] || 'Unknown';
  }

  getStatusClass(status: UserStoryStateValue | undefined): string {
      const normalizedStatus = this.normalizeStatusValue(status);
      const classes: Record<string, string> = {
        '0': 'status-todo',
        '1': 'status-todo',
        '2': 'status-inprogress',
        '3': 'status-done',
        '4': 'status-done',
        [UserStoryStatus.TODO]: 'status-todo',
        [UserStoryStatus.IN_PROGRESS]: 'status-inprogress',
        [UserStoryStatus.REVIEW]: 'status-inprogress',
        [UserStoryStatus.TESTING]: 'status-inprogress',
        [UserStoryStatus.DONE]: 'status-done',
      };
      return classes[normalizedStatus] || '';
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
      2: 'High',
      3: 'Medium',
      4: 'Low',
      5: 'Very low'
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

  canDeleteUserStory(userStory?: UserStoryDto): boolean {
    if (!userStory) {
      return false;
    }

    return this.normalizeStatusValue(userStory.status) === UserStoryStatus.TODO || Number(userStory.userStoryState ?? 1) === 1;
  }

  viewUserStory(id: string): void {
    this.route.navigate(['/userstory/view', id]);
  }

  createUserStory(): void {
    if (this.sprintId === null) {
      this.error = 'Invalid sprint for creating a user story';
      return;
    }

    this.error = '';
    this.showCreateForm = !this.showCreateForm;
    if (this.showCreateForm) {
      this.createForm.sprintId = this.sprintId;
    }
  }

  submitCreateUserStory(): void {
    if (this.createSubmitting) {
      return;
    }

    if (this.sprintId === null) {
      this.error = 'Invalid sprint for creating a user story';
      return;
    }

    const title = this.createForm.title?.trim();
    if (!title) {
      this.error = 'Title is required';
      return;
    }

    const storyPoints = Number(this.createForm.storyPoints);
    const priority = Number(this.createForm.priority);

    if (!this.isValidNumber(storyPoints, 1) || !this.isValidNumber(priority, 1, 5)) {
      this.error = 'Invalid story points or priority';
      return;
    }

    const now = new Date();
    const payload: CreateUserStoryRequest = {
      name: title,
      title,
      description: (this.createForm.description || '').trim(),
      acceptanceCriteria: (this.createForm.acceptanceCriteria || '').trim(),
      storyPoints,
      priority,
      status: UserStoryStatus.TODO,
      startDate: now,
      endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      estimatedDuration: 1,
      userStoryState: 1,
      projectId: 0,
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
          this.error = err?.error?.message || 'Error while creating the user story';
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

    const story = this.userStories.find(item => Number(item.id) === Number(id));
    if (!story) {
      return;
    }

    const title = window.prompt('User story title:', story.title);
    if (!title?.trim()) {
      return;
    }

    const description = window.prompt('Description:', story.description) ?? story.description;
    const acceptanceCriteria = window.prompt('Acceptance criteria:', story.acceptanceCriteria) ?? story.acceptanceCriteria;
    const storyPoints = Number(window.prompt('Story points:', String(story.storyPoints)) ?? String(story.storyPoints));
 



    const updatePayload: UpdateUserStoryRequest = {
      id: Number(id),
      name: title.trim(),
      title: title.trim(),
      description,

      estimatedDuration: Number(story.estimatedDuration ?? 1),
      userStoryState: Number(story.userStoryState ?? 1),
      projectId: 0,
      sprintId: Number(story.sprintId ?? this.sprintId ?? 0),
      acceptanceCriteria,
      storyPoints,
    
      assignedToId: story.assignedToId
    };

    this.userStoryService.update(Number(id), updatePayload).subscribe({
      next: () => this.loadUserStories(),
      error: (err) => {
        this.error = 'Error while updating the user story';
        console.error(err);
      }
    });
  }

  deleteUserStory(id: string, event: Event): void {
    event.stopPropagation();

    const story = this.userStories.find((item) => String(item.id) === String(id));
    if (!this.canDeleteUserStory(story)) {
      this.error = 'You can delete a user story only when it is pending.';
      return;
    }

    if (confirm('Are you sure you want to delete this user story and all its tasks?')) {
      this.userStoryService.delete(Number(id)).subscribe({
        next: () => {
          this.loadUserStories();
        },
        error: (err) => {
          this.error = 'Error while deleting the user story';
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

  private normalizeStatusValue(status: UserStoryStateValue | undefined): string {
    if (status === null || status === undefined) {
      return '';
    }

    const numericStatus = Number(status);
    if (Number.isFinite(numericStatus)) {
      return String(numericStatus);
    }

    return String(status).trim();
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

  private startLoadingWatchdog(): void {
    this.clearLoadingWatchdog();
    this.loadingWatchdogId = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.error = 'Chargement trop long. Veuillez reessayer.';
      }
    }, 12000);
  }

  private clearLoadingWatchdog(): void {
    if (this.loadingWatchdogId !== null) {
      clearTimeout(this.loadingWatchdogId);
      this.loadingWatchdogId = null;
    }
  }

}