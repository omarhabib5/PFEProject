import { Component, OnInit } from '@angular/core';
import { UserStoryService } from '../Service/UserStoryService';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateUserStoryRequest, UpdateUserStoryRequest, UserStoryDto, UserStoryStatus, UserStoryStateValue } from '../Models/userstory.model';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIf, NgForOf } from '@angular/common';
import { finalize, timeout } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { TokenService } from '../../../Auth/Service/token.service';
import { AppRole } from '../../../Auth/model/auth.model';
import { Sprint, SprintService } from '../../Sprint/Service/SprintService';

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
  sprint: Sprint | null = null;
  projectId: number | null = null;
  loading: boolean = false;
  error: string = '';
  showCreateForm = false;
  createSubmitting = false;
  State = UserStoryStatus;
  canManageUserStories = false;
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
    private sprintService: SprintService,
    private route: Router,
    private activatedRoute: ActivatedRoute,
    private tokenService: TokenService,
  ) { }
  ngOnInit(): void {
    const role = this.tokenService.getUserRole();
    this.canManageUserStories = role === AppRole.Admin || role === AppRole.ProjectManager;

    this.activatedRoute.params.subscribe(params => {
      const sprintIdFromPath = Number(params['sprintId']);
      const sprintIdFromQuery = Number(this.activatedRoute.snapshot.queryParamMap.get('sprintId'));
      const sprintIdParam = Number.isFinite(sprintIdFromPath) && sprintIdFromPath > 0
        ? sprintIdFromPath
        : sprintIdFromQuery;

      this.sprintId = Number.isFinite(sprintIdParam) && sprintIdParam > 0 ? sprintIdParam : null;
      if (this.sprintId !== null) {
        this.createForm.sprintId = this.sprintId;
        this.loadSprintContext();
      } else {
        this.loading = false;
        this.error = 'Sprint invalide pour charger les user stories';
      }
    });
  }

  private loadSprintContext(): void {
    if (this.sprintId === null) {
      this.error = 'Sprint invalide pour charger les user stories';
      return;
    }

    this.loading = true;
    this.error = '';

    this.sprintService.getSprintById(this.sprintId)
      .pipe(timeout(10000))
      .subscribe({
        next: (sprint) => {
          this.sprint = sprint;
          this.projectId = Number((sprint as any)?.projectId ?? (sprint as any)?.ProjectId ?? 0) || null;
          this.loadUserStories();
        },
        error: (err: unknown) => {
          this.loading = false;
          this.error = this.extractErrorMessage(err, 'Erreur lors du chargement du sprint');
          console.error(err);
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
        this.error = this.extractErrorMessage(err, 'Erreur lors du chargement des user stories');
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

    if (this.canManageUserStories) {
      return true;
    }

    return this.normalizeStatusValue(userStory.status) === UserStoryStatus.TODO || Number(userStory.userStoryState ?? 1) === 1;
  }

  viewUserStory(id: string): void {
    this.route.navigate(['/userstory/view', id]);
  }

  createUserStory(): void {
    if (!this.canManageUserStories) {
      this.error = 'You are not allowed to manage user stories.';
      return;
    }

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
    if (!this.canManageUserStories) {
      this.error = 'You are not allowed to manage user stories.';
      return;
    }

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

    if (this.hasDuplicateUserStoryTitle(title)) {
      this.error = 'A user story with this name already exists.';
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
      projectId: this.projectId ?? 0,
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
          this.error = this.extractErrorMessage(err, 'Error while creating the user story');
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

    if (!this.canManageUserStories) {
      this.error = 'You are not allowed to manage user stories.';
      return;
    }

    const story = this.userStories.find(item => Number(item.id) === Number(id));
    if (!story) {
      return;
    }

    const title = window.prompt('User story title:', story.title);
    if (!title?.trim()) {
      return;
    }

    const normalizedTitle = title.trim();
    if (this.hasDuplicateUserStoryTitle(normalizedTitle, Number(id))) {
      this.error = 'A user story with this name already exists.';
      return;
    }

    const description = window.prompt('Description:', story.description) ?? story.description;
    const acceptanceCriteria = window.prompt('Acceptance criteria:', story.acceptanceCriteria) ?? story.acceptanceCriteria;
    const storyPoints = Number(window.prompt('Story points:', String(story.storyPoints)) ?? String(story.storyPoints));
    const priority = Number(window.prompt('Priority (1-5):', String((story as any)?.priority ?? 3)) ?? String((story as any)?.priority ?? 3));

    if (!this.isValidNumber(storyPoints, 1)) {
      this.error = 'Story points must be greater than 0.';
      return;
    }

    if (!this.isValidNumber(priority, 1, 5)) {
      this.error = 'Priority must be between 1 and 5.';
      return;
    }
 



    const updatePayload: UpdateUserStoryRequest = {
      id: Number(id),
      name: normalizedTitle,
      title: normalizedTitle,
      description,

      estimatedDuration: Number(story.estimatedDuration ?? 1),
      userStoryState: Number(story.userStoryState ?? 1),
      projectId: this.projectId ?? Number((story as any)?.projectId ?? 0),
      sprintId: Number(story.sprintId ?? this.sprintId ?? 0),
      acceptanceCriteria,
      storyPoints,
      priority,
    
      assignedToId: story.assignedToId
    };

    this.userStoryService.update(Number(id), updatePayload).subscribe({
      next: () => this.loadUserStories(),
      error: (err) => {
        this.error = this.extractErrorMessage(err, 'Error while updating the user story');
        console.error(err);
      }
    });
  }

  deleteUserStory(id: string, event: Event): void {
    event.stopPropagation();

    if (!this.canManageUserStories) {
      this.error = 'You are not allowed to manage user stories.';
      return;
    }

    const story = this.userStories.find((item) => String(item.id) === String(id));
    if (!this.canDeleteUserStory(story)) {
      this.error = 'Unable to delete this user story.';
      return;
    }

    const normalizedId = String(id ?? '').trim();
    if (!normalizedId) {
      this.error = 'Invalid user story identifier.';
      return;
    }

    if (confirm('Are you sure you want to delete this user story and all its tasks?')) {
      this.userStoryService.delete(normalizedId).subscribe({
        next: () => {
          this.loadUserStories();
        },
        error: (err) => {
          this.error = this.extractErrorMessage(err, 'Error while deleting the user story');
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

  private extractErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim().length > 0) {
        return error.error;
      }

      if (error.error && typeof error.error === 'object') {
        const backendMessage = (error.error as { message?: unknown }).message;
        if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
          return backendMessage;
        }
      }

      if (error.message.trim().length > 0) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return fallbackMessage;
  }

  private hasDuplicateUserStoryTitle(title: string, excludedUserStoryId?: number): boolean {
    const normalizedTitle = title.trim().toLowerCase();
    if (!normalizedTitle) {
      return false;
    }

    return this.userStories.some((story) => {
      if (excludedUserStoryId !== undefined && Number(story.id) === Number(excludedUserStoryId)) {
        return false;
      }

      return (story.title ?? '').trim().toLowerCase() === normalizedTitle;
    });
  }

}