import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService, project, CreateProjectDto, UpdateProjectDto, State } from '../Service/ProjectService';
import { TeamService, Team } from '../../Team/Service/TeamService';
import { ServiceService, Service } from '../../Team/Service/ServiceService';
import { UserApiService, UserDto } from '../../Team/Service/UserApiService';

@Component({
  selector: 'app-project-manager',
  imports: [CommonModule, FormsModule],
  templateUrl: './project-manager.html',
  styleUrl: './project-manager.css',
})
export class ProjectManager implements OnInit {
  private projectService = inject(ProjectService);
  private teamService = inject(TeamService);
  private serviceService = inject(ServiceService);
  private userService = inject(UserApiService);
  private cdr = inject(ChangeDetectorRef);
  
  projects: project[] = [];
  teams: Team[] = [];
  services: Service[] = [];
  users: UserDto[] = [];

  
  loading = false;
  showCreateProjectForm = false;
  isEditMode = false;
  editingProjectId: number | null = null;
  selectedProject: project | null = null;
  error: string | null = null;
  successMessage: string | null = null;

  // Form model with string dates for HTML inputs
  newProject: any = {
    name: '',
    description: '',
    startDate: this.formatDateForInput(new Date()),
    endDate: this.formatDateForInput(new Date()),
    estimatedDuration: 0,
    projectState: State.pending,
    serviceId: undefined,
    teamId: undefined,
    projectManagerId: 0,
  };

  
  State = State;
  stateOptions = [
    { value: State.pending, label: 'pending' },
    { value: State.todo, label: 'todo' },
    { value: State.inProgress, label: 'inProgress' },
    { value: State.done, label: 'done' },
    { value: State.validated, label: 'validated' }
  ];

  ngOnInit(): void {
    this.loadProjects();
    this.loadTeams();
    this.loadServices();
    this.loadUsers();
  }

  loadProjects(): void {
    this.loading = true;
    this.projectService.getAllProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.loading = false;
            this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load projects: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  loadTeams(): void {
    this.teamService.getTeams().subscribe({
      next: (data) => {
        this.teams = data;
      },
      error: (err) => {
        console.error('Failed to load teams:', err);
      }
    });
  }

  loadServices(): void {
    this.serviceService.getServices().subscribe({
      next: (data) => {
        this.services = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load services:', err);
      }
    });
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
            this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load users:', err);
      }
    });
  }

  toggleCreateProjectForm(): void {
    this.showCreateProjectForm = !this.showCreateProjectForm;
    if (!this.showCreateProjectForm) {
      this.resetForm();
    }
  }

  createProject(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = null;

    const projectData: CreateProjectDto = {
      ...this.newProject,
      startDate: new Date(this.newProject.startDate),
      endDate: new Date(this.newProject.endDate),
      projectState: Number(this.newProject.projectState)
    };

    this.projectService.createProject(projectData).subscribe({
      next: (response) => {
        this.successMessage = 'Project created successfully!';
        this.loadProjects();
        this.resetForm();
        this.showCreateProjectForm = false;
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        this.error = 'Failed to create project: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  startEditProject(project: project): void {
    this.isEditMode = true;
    this.editingProjectId = project.id!;
    this.showCreateProjectForm = true;
    
    this.newProject = {
      name: project.name,
      description: project.description || '',
      startDate: this.formatDateForInput(new Date(project.startDate)),
      endDate: this.formatDateForInput(new Date(project.endDate)),
      estimatedDuration: project.estimatedDuration,
      projectState: project.projectState,
      serviceId: project.serviceId,
      teamId: project.teamId,
      projectManagerId: project.projectManagerId,
    };
  }

  updateProject(): void {
    if (!this.validateForm() || !this.editingProjectId) {
      return;
    }

    this.loading = true;
    this.error = null;

    const updateData: UpdateProjectDto = {
      name: this.newProject.name,
      description: this.newProject.description,
      startDate: new Date(this.newProject.startDate),
      endDate: new Date(this.newProject.endDate),
      estimatedDuration: this.newProject.estimatedDuration,
      projectState: Number(this.newProject.projectState),
      serviceId: this.newProject.serviceId,
      teamId: this.newProject.teamId,
      projectManagerId: this.newProject.projectManagerId,
    };

    this.projectService.updateProject(this.editingProjectId, updateData).subscribe({
      next: () => {
        this.successMessage = 'Project updated successfully!';
        this.loadProjects();
        this.resetForm();
        this.showCreateProjectForm = false;
        this.loading = false;
            this.cdr.detectChanges();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        this.error = 'Failed to update project: ' + (err.error?.message || err.message);
        this.loading = false;
            this.cdr.detectChanges();
      }
    });
  }

  deleteProject(projectId: number): void {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.projectService.deleteProject(projectId).subscribe({
      next: () => {
        this.successMessage = 'Project deleted successfully!';
        this.loadProjects();
        this.loading = false;
            this.cdr.detectChanges();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        this.error = 'Failed to delete project: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  viewProjectDetails(project: project): void {
    this.selectedProject = project;
  }

  backToProjectsList(): void {
    this.selectedProject = null;
  }

  validateForm(): boolean {
    if (!this.newProject.name || this.newProject.name.trim() === '') {
      this.error = 'Project name is required';
      return false;
    }
    if (!this.newProject.projectManagerId || this.newProject.projectManagerId === 0) {
      this.error = 'Project manager is required';
      return false;
    }
   
    const startDate = new Date(this.newProject.startDate);
    const endDate = new Date(this.newProject.endDate);
    if (startDate >= endDate) {
      this.error = 'End date must be after start date';
      return false;
    }
    return true;
  }

  resetForm(): void {
    this.newProject = {
      name: '',
      description: '',
      startDate: this.formatDateForInput(new Date()),
      endDate: this.formatDateForInput(new Date()),
      estimatedDuration: 0,
      projectState: State.pending,
      serviceId: undefined,
      teamId: undefined,
      projectManagerId: 0,
    };
    this.isEditMode = false;
    this.editingProjectId = null;
    this.error = null;
  }

  getStateName(state: State): string {
    return State[state];
  }

  getServiceName(serviceId?: number): string {
    if (!serviceId) return 'N/A';
    const service = this.services.find(s => s.id === serviceId);
    return service ? service.name : 'Unknown';
  }

  getTeamName(teamId?: number): string {
    if (!teamId) return 'N/A';
    const team = this.teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown';
  }

  getUserName(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
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