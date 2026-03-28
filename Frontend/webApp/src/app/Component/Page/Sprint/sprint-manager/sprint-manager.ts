import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SprintService, Sprint, CreateSprintDto, UpdateSprintDto, State } from '../Service/SprintService';
import { ProjectService, project } from '../../Projet/Service/ProjectService';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-sprint-manager',
  imports: [CommonModule, FormsModule],
  templateUrl: './sprint-manager.html',
  styleUrl: './sprint-manager.css',
})
export class SprintManager implements OnInit, OnDestroy {
  private sprintService = inject(SprintService);
  private projectService = inject(ProjectService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private autoRefreshSubscription: Subscription | null = null;
  private readonly autoRefreshMs = 15000;

  sprints: Sprint[] = [];
  projects: project[] = [];

  loading = false;
  showCreateSprintForm = false;
  isEditMode = false;
  editingSprintId: number | null = null;
  selectedSprint: Sprint | null = null;
  filterProjectId: number | undefined = undefined;
  error: string | null = null;
  successMessage: string | null = null;


  newSprint: any = {
    name: '',
    description: '',
    startDate: this.formatDateForInput(new Date()),
    endDate: this.formatDateForInput(new Date()),
    estimatedDuration: 0,
    sprintState: State.pending,
    projectId: 0,
  };

  State = State;
  stateOptions = [
    { value: State.pending, label: 'Pending' },
    { value: State.todo, label: 'To Do' },
    { value: State.inProgress, label: 'In Progress' },
    { value: State.done, label: 'Done' },
    { value: State.validated, label: 'Validated' }
  ];

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const projectId = Number(params['projectId']);
      if (projectId) {
        this.filterProjectId = projectId;
      }
    });

    this.route.queryParams.subscribe(params => {
      const editId = Number(params['editId']);
      if (editId) {
        this.prefillEdit(editId);
      }
    });

    this.loadSprints();
    this.loadProjects();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private prefillEdit(id: number): void {
    this.sprintService.getSprintById(id).subscribe({
      next: (sprint) => this.startEditSprint(sprint),
      error: () => {
        this.error = 'Unable to load sprint for editing';
        this.cdr.detectChanges();
      }
    });
  }

  loadSprints(): void {
    this.loading = true;
    this.error = null;

    if (this.filterProjectId) {
      this.sprintService.getSprintsByProjectId(this.filterProjectId).subscribe({
        next: (data) => {
          this.sprints = data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = 'Failed to load sprints: ' + (err.error?.message || err.message);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.sprintService.getAllSprints().subscribe({
        next: (data) => {
          this.sprints = data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = 'Failed to load sprints: ' + (err.error?.message || err.message);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  loadProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load projects:', err);
      }
    });
  }

  filterByProject(): void {
    this.loadSprints();
  }

  clearFilter(): void {
    this.filterProjectId = undefined;
    this.loadSprints();
  }

  toggleCreateSprintForm(): void {
    this.showCreateSprintForm = !this.showCreateSprintForm;
    if (!this.showCreateSprintForm) {
      this.resetForm();
    }
  }

  createSprint(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = null;

    const sprintData: CreateSprintDto = {
      name: this.newSprint.name,
      description: this.newSprint.description,
      startDate: new Date(this.newSprint.startDate),
      endDate: new Date(this.newSprint.endDate),
      estimatedDuration: Number(this.newSprint.estimatedDuration),
      sprintState: Number(this.newSprint.sprintState),
      projectId: Number(this.newSprint.projectId)
    };

    this.sprintService.createSprint(sprintData).subscribe({
      next: (response) => {
        this.successMessage = 'Sprint created successfully!';
        this.loadSprints();
        this.resetForm();
        this.showCreateSprintForm = false;
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        this.error = 'Failed to create sprint: ' + (err.error?.message || err.message);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  startEditSprint(sprint: Sprint): void {
    this.isEditMode = true;
    this.editingSprintId = sprint.id;
    this.showCreateSprintForm = true;

    this.newSprint = {
      name: sprint.name,
      description: sprint.description,
      startDate: this.formatDateForInput(new Date(sprint.startDate)),
      endDate: this.formatDateForInput(new Date(sprint.endDate)),
      estimatedDuration: sprint.estimatedDuration,
      sprintState: sprint.sprintState,
      projectId: sprint.projectId,
    };
  }

  updateSprint(): void {
    if (!this.validateForm() || !this.editingSprintId) {
      return;
    }

    this.loading = true;
    this.error = null;

    const updateData: UpdateSprintDto = {
      id: this.editingSprintId,
      name: this.newSprint.name,
      description: this.newSprint.description,
      startDate: new Date(this.newSprint.startDate),
      endDate: new Date(this.newSprint.endDate),
      estimatedDuration: Number(this.newSprint.estimatedDuration),
      sprintState: Number(this.newSprint.sprintState),
      projectId: Number(this.newSprint.projectId)
    };

    this.sprintService.updateSprint(this.editingSprintId, updateData).subscribe({
      next: () => {
        this.successMessage = 'Sprint updated successfully!';
        this.loadSprints();
        this.resetForm();
        this.showCreateSprintForm = false;
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        this.error = 'Failed to update sprint: ' + (err.error?.message || err.message);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteSprint(sprintId: number): void {
    if (!confirm('Are you sure you want to delete this sprint? This action cannot be undone.')) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.sprintService.deleteSprint(sprintId).subscribe({
      next: () => {
        this.successMessage = 'Sprint deleted successfully!';
        this.loadSprints();
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        this.error = 'Failed to delete sprint: ' + (err.error?.message || err.message);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewSprintDetails(sprint: Sprint): void {
    this.selectedSprint = sprint;
  }

  backToSprintsList(): void {
    this.selectedSprint = null;
  }

  validateForm(): boolean {
    if (!this.newSprint.name || this.newSprint.name.trim() === '') {
      this.error = 'Sprint name is required';
      return false;
    }
    if (!this.newSprint.projectId || this.newSprint.projectId === 0) {
      this.error = 'Project is required';
      return false;
    }

    const startDate = new Date(this.newSprint.startDate);
    const endDate = new Date(this.newSprint.endDate);
    if (startDate >= endDate) {
      this.error = 'End date must be after start date';
      return false;
    }
    return true;
  }

  resetForm(): void {
    this.newSprint = {
      name: '',
      description: '',
      startDate: this.formatDateForInput(new Date()),
      endDate: this.formatDateForInput(new Date()),
      estimatedDuration: 0,
      sprintState: State.pending,
      projectId: 0,
    };
    this.isEditMode = false;
    this.editingSprintId = null;
    this.error = null;
  }

  getStateName(state: State): string {
    const option = this.stateOptions.find(opt => opt.value === state);
    return option ? option.label : State[state];
  }

  getProjectName(projectId: number): string {
    const project = this.projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  formatDateForInput(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshSubscription = interval(this.autoRefreshMs).subscribe(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      this.loadSprints();
      this.loadProjects();
    });
  }

  private stopAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
    this.autoRefreshSubscription = null;
  }
}