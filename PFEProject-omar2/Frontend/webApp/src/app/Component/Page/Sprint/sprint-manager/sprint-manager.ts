import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SprintService, Sprint, CreateSprintDto, UpdateSprintDto, State } from '../Service/SprintService';
import { ProjectService, project } from '../../Projet/Service/ProjectService';

@Component({
  selector: 'app-sprint-manager',
  imports: [CommonModule, FormsModule],
  templateUrl: './sprint-manager.html',
  styleUrl: './sprint-manager.css',
})
export class SprintManager implements OnInit {
  private sprintService = inject(SprintService);
  private projectService = inject(ProjectService);
  private cdr = inject(ChangeDetectorRef);
  
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
    this.loadSprints();
    this.loadProjects();
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

    this.onSprintDatesChange();

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

    this.onSprintDatesChange();
  }

  updateSprint(): void {
    if (!this.validateForm() || !this.editingSprintId) {
      return;
    }

    this.onSprintDatesChange();

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

    if (!this.isDateInRange(this.newSprint.startDate, this.sprintMinDateInput, this.sprintMaxDateInput)
      || !this.isDateInRange(this.newSprint.endDate, this.sprintMinDateInput, this.sprintMaxDateInput)) {
      this.error = 'Sprint dates must be inside selected project period';
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
    this.onSprintDatesChange();
  }

  onSprintDatesChange(): void {
    if (this.newSprint.endDate && this.newSprint.startDate && this.newSprint.endDate < this.newSprint.startDate) {
      this.newSprint.endDate = this.newSprint.startDate;
    }
    this.newSprint.estimatedDuration = this.calculateEstimatedDurationDays(this.newSprint.startDate, this.newSprint.endDate);
  }

  onSprintProjectChange(): void {
    const minDate = this.sprintMinDateInput;
    const maxDate = this.sprintMaxDateInput;

    if (!this.isDateInRange(this.newSprint.startDate, minDate, maxDate)) {
      this.newSprint.startDate = minDate || this.newSprint.startDate;
    }

    if (!this.isDateInRange(this.newSprint.endDate, minDate, maxDate) || this.newSprint.endDate < this.newSprint.startDate) {
      this.newSprint.endDate = this.newSprint.startDate;
    }

    this.onSprintDatesChange();
  }

  get sprintMinDateInput(): string {
    const selectedProject = this.getSelectedProject();
    return selectedProject?.startDate ? this.formatDateForInput(new Date(selectedProject.startDate)) : '';
  }

  get sprintMaxDateInput(): string {
    const selectedProject = this.getSelectedProject();
    return selectedProject?.endDate ? this.formatDateForInput(new Date(selectedProject.endDate)) : '';
  }

  private calculateEstimatedDurationDays(startDateValue: string | Date, endDateValue: string | Date): number {
    const startDate = new Date(startDateValue);
    const endDate = new Date(endDateValue);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 0;
    }

    const diffInMs = endDate.getTime() - startDate.getTime();
    if (diffInMs <= 0) {
      return 0;
    }

    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  }

  private getSelectedProject(): project | undefined {
    const projectId = Number(this.newSprint.projectId ?? 0);
    if (!projectId) {
      return undefined;
    }

    return this.projects.find((item) => Number(item.id) === projectId);
  }

  private isDateInRange(value: string, minDate?: string, maxDate?: string): boolean {
    if (!value) return false;
    if (minDate && value < minDate) return false;
    if (maxDate && value > maxDate) return false;
    return true;
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
}
