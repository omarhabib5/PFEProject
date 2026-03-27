import { Component, OnDestroy, OnInit } from '@angular/core';
import { UserStoryService } from '../Service/UserStoryService';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateUserStoryRequest, UpdateUserStoryRequest, UserStoryDto, UserStoryStatus } from '../Models/userstory.model';
import { NgIf, NgForOf } from '@angular/common';
import { Subscription, finalize, interval, timeout } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-story-manager',
  standalone: true,
  imports: [NgIf, NgForOf, FormsModule],
  templateUrl: './user-story-manager.html',
  styleUrl: './user-story-manager.css',
})
export class UserStoryManagerComponent implements OnInit, OnDestroy {
  userStories: UserStoryDto[] = [];
  sprintId: number | null = null;
  loading: boolean = false;
  error: string = '';
  showCreateForm = false;
  createSubmitting = false;
  private autoRefreshSubscription: Subscription | null = null;
  private readonly autoRefreshMs = 15000;
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
    this.activatedRoute.params.subscribe(params => {
      const sprintIdParam = Number(params['sprintId']);
      this.sprintId = Number.isFinite(sprintIdParam) && sprintIdParam > 0 ? sprintIdParam : null;
      if (this.sprintId !== null) {
        this.createForm.sprintId = this.sprintId;
        this.loadUserStories();
        this.startAutoRefresh();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadUserStories(): void {
    if (this.sprintId === null) {
      this.error = 'Invalid sprint to load user stories';
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
        this.error = 'Error while loading user stories';
        console.error(err);
      }
      });
  }

  getStatusLabel(status: UserStoryStatus): string {
      const labels: Record<UserStoryStatus, string> = {
        [UserStoryStatus.TODO]: 'To Do',
        [UserStoryStatus.IN_PROGRESS]: 'In Progress',
        [UserStoryStatus.REVIEW]: 'Review',
        [UserStoryStatus.TESTING]: 'Testing',
        [UserStoryStatus.DONE]: 'Done',
      };
      return labels[status] || 'Unknown';
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
      1: 'Critical',
      2: 'High',
      3: 'Medium',
      4: 'Low',
      5: 'Very Low'
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
    if (this.sprintId === null) {
      this.error = 'Invalid sprint to create a user story';
      return;
    }

    this.showCreateForm = !this.showCreateForm;
    if (this.showCreateForm) {
      this.createForm.sprintId = this.sprintId;
    }
  }

  submitCreateUserStory(): void {
    if (this.sprintId === null) {
      this.error = 'Invalid sprint to create a user story';
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
      description: this.createForm.description || '',
      acceptanceCriteria: this.createForm.acceptanceCriteria || '',
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
          this.error = 'Error while creating the user story';
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

    const story = this.userStories.find(item => item.id === id);
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
    const priority = Number(window.prompt('Priority (1-5):', String(story.priority)) ?? String(story.priority));

    if (!this.isValidNumber(storyPoints, 1) || !this.isValidNumber(priority, 1, 5)) {
      this.error = 'Invalid story points or priority';
      return;
    }

    const updatePayload: UpdateUserStoryRequest = {
      id: Number(id),
      name: title.trim(),
      title: title.trim(),
      description,
      startDate: story.startDate ? new Date(story.startDate) : new Date(),
      endDate: story.endDate ? new Date(story.endDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      estimatedDuration: Number(story.estimatedDuration ?? 1),
      userStoryState: Number(story.userStoryState ?? 1),
      projectId: 0,
      sprintId: Number(story.sprintId ?? this.sprintId ?? 0),
      acceptanceCriteria,
      storyPoints,
      priority,
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

    if (confirm('Are you sure you want to delete this user story and all its tasks?')) {
      this.userStoryService.delete(Number(id)).subscribe({
        next: () => {
          this.loadUserStories();
        },
        error: (err) => {
          this.error = 'Error while deleting';
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

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshSubscription = interval(this.autoRefreshMs).subscribe(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      if (this.sprintId !== null) {
        this.loadUserStories();
      }
    });
  }

  private stopAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
    this.autoRefreshSubscription = null;
  }

}