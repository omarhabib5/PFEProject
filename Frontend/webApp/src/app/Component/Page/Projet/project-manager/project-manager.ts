import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService, project, CreateProjectDto, UpdateProjectDto, State } from '../Service/ProjectService';
import { TeamService, Team, TeamUser } from '../../Team/Service/TeamService';
import { ServiceService, Service } from '../../Team/Service/ServiceService';
import { UserApiService, UserDto } from '../../Team/Service/UserApiService';
import { SprintService, Sprint, CreateSprintDto, UpdateSprintDto, State as SprintState } from '../../Sprint/Service/SprintService';
import { TaskService, TaskDto } from '../../Task/Service/TaskService';
import { UserStoryService } from '../../UserStory/Service/UserStoryService';
import { CreateUserStoryRequest, UpdateUserStoryRequest, UserStoryDto, UserStoryStatus } from '../../UserStory/Models/userstory.model';
import { TokenService } from '../../../Auth/Service/token.service';
import { AppRole } from '../../../Auth/model/auth.model';

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
  private sprintService = inject(SprintService);
  private taskService = inject(TaskService);
  private userStoryService = inject(UserStoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private tokenService = inject(TokenService);
  
  projects: project[] = [];
  allProjects: project[] = [];
  teams: Team[] = [];
  services: Service[] = [];
  users: UserDto[] = [];
  tasks: TaskDto[] = [];
  projectManagerUsers: UserDto[] = [];
  selectedServiceFilter: number | null = null;
  private requestedProjectId: number | null = null;
  private requestedDetailTab: 'overview' | 'stories' | 'sprints' = 'overview';

  
  loading = false;
  showCreateProjectForm = false;
  isEditMode = false;
  editingProjectId: number | null = null;
  selectedProject: project | null = null;
  selectedProjectMembers: UserDto[] = [];
  projectSprints: Sprint[] = [];
  projectUserStories: UserStoryDto[] = [];
  detailTab: 'overview' | 'stories' | 'sprints' = 'overview';
  showCreateSprintFormInDetails = false;
  isEditingSprintInDetails = false;
  editingSprintDetailId: number | null = null;
  showCreateUserStoryFormInDetails = false;
  isEditingUserStoryInDetails = false;
  editingUserStoryDetailId: string | null = null;
  openSprintMenuId: number | null = null;
  openUserStoryMenuId: string | null = null;
  showExportMenu = false;
  currentDateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  error: string | null = null;
  successMessage: string | null = null;

  get canViewKanban(): boolean {
    return this.tokenService.getUserRole() !== AppRole.ServiceManager;
  }

  get canManageUserStories(): boolean {
    const role = this.tokenService.getUserRole();
    return role === AppRole.Admin || role === AppRole.ProjectManager;
  }

 
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
  sprintStateOptions = [
    { value: SprintState.pending, label: 'Pending' },
    { value: SprintState.todo, label: 'To Do' },
    { value: SprintState.inProgress, label: 'In Progress' },
    { value: SprintState.done, label: 'Done' },
    { value: SprintState.validated, label: 'Validated' }
  ];
  userStoryStateOptions = [
    { value: State.pending, label: 'Pending' },
    { value: State.todo, label: 'To Do' },
    { value: State.inProgress, label: 'In Progress' },
    { value: State.done, label: 'Done' },
    { value: State.validated, label: 'Validated' }
  ];
  userStoryPriorityOptions = [1, 2, 3, 4, 5];
  stateOptions = [
    { value: State.pending, label: 'pending' },
    { value: State.todo, label: 'todo' },
    { value: State.inProgress, label: 'inProgress' },
    { value: State.done, label: 'done' },
    { value: State.validated, label: 'validated' }
  ];

  newDetailSprint: any = {
    name: '',
    description: '',
    startDate: this.formatDateForInput(new Date()),
    endDate: this.formatDateForInput(new Date()),
    estimatedDuration: 0,
    sprintState: SprintState.pending,
    projectId: 0,
  };

  newDetailUserStory: any = {
    name: '',
    description: '',
    startDate: this.formatDateForInput(new Date()),
    endDate: this.formatDateForInput(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    estimatedDuration: 1,
    userStoryState: State.todo,
    sprintId: '',
    projectId: 0
  };

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const serviceIdParam = params.get('serviceId');
      const projectIdParam = params.get('projectId');
      const detailTabParam = params.get('detailTab');
      this.selectedServiceFilter = serviceIdParam ? Number(serviceIdParam) : null;

      this.requestedProjectId = projectIdParam ? Number(projectIdParam) : null;
      this.requestedDetailTab = detailTabParam === 'stories' || detailTabParam === 'sprints' ? detailTabParam : 'overview';

      if (this.selectedServiceFilter && !Number.isNaN(this.selectedServiceFilter)) {
        this.newProject.serviceId = this.selectedServiceFilter;
      }

      this.applyServiceFilter();
      this.openRequestedProjectIfNeeded();
    });

    this.loadProjects();
    this.loadTeams();
    this.loadServices();
    this.loadUsers();
    this.loadTasks();
  }

  loadProjects(): void {
    this.loading = true;
    this.projectService.getAllProjects().subscribe({
      next: (data) => {
        this.allProjects = data;
        this.applyServiceFilter();
        this.openRequestedProjectIfNeeded();
        this.loading = false;
            this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load projects: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  private applyServiceFilter(): void {
    if (this.selectedServiceFilter === null || Number.isNaN(this.selectedServiceFilter)) {
      this.projects = [...this.allProjects];
      return;
    }

    this.projects = this.allProjects.filter((item) => Number(item.serviceId ?? -1) === this.selectedServiceFilter);
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
        this.projectManagerUsers = data.filter((user) => this.isProjectManagerRole(user.role));
            this.cdr.detectChanges();
      },
      error: (err) => {
        this.projectManagerUsers = [];
        console.error('Failed to load users:', err);
      }
    });
  }

  loadTasks(): void {
    this.taskService.getAll().subscribe({
      next: (data) => {
        this.tasks = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load tasks:', err);
      }
    });
  }

  private isProjectManagerRole(role: string | number | undefined): boolean {
    if (typeof role === 'number') {
      return role === 2;
    }

    const normalized = String(role ?? '').trim().toLowerCase();
    return normalized === '2'
      || normalized === 'projectmanager'
      || normalized === 'project manager'
      || normalized === 'project_manager';
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


    this.onProjectDatesChange();

    this.loading = true;
    this.error = null;

    const projectData: CreateProjectDto = {
      ...this.newProject,
      startDate: new Date(this.newProject.startDate),
      endDate: new Date(this.newProject.endDate),
      projectState: Number(this.newProject.projectState)
    };
    const newName = projectData.name.trim();
    if(!newName){
      this.error='PROJECT NAME IS REQUIRED'
    
      return;
    }
   const nameExists = this.allProjects.some(p =>
  String(p.name ?? '').trim().toLowerCase() === newName
);
if (nameExists) {
  this.error = 'project already exist';
  this.loading = false;
  return;
}

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

    this.onProjectDatesChange();
  }

  updateProject(): void {
    if (!this.validateForm() || !this.editingProjectId) {
      return;
    }

    this.onProjectDatesChange();

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
const updatedName = (this.newProject.name ?? '').trim().toLowerCase();
if (!updatedName) {
  this.error = 'Project name is required';
  return;
}
const nameConflict = this.allProjects.some(p =>
  p.id !== this.editingProjectId &&
  String(p.name ?? '').trim().toLowerCase() === updatedName
);
if (nameConflict) {
  this.error = 'A project with this name already exists.';
  this.loading = false;
  return;
}
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
    const project = this.allProjects.find((item) => item.id === projectId);
    if (!this.canDeleteProject(project)) {
      alert('You cannot delete this project unless it is pending.');
      return;
    }

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
    this.detailTab = 'overview';
    this.resetDetailForms();
    this.loadSelectedProjectMembers(project);
    if (project.id) {
      this.loadProjectSprints(project.id);
      this.loadProjectUserStories(project.id);
    }
  }

  openProjectExportChooser(): void {
    if (!this.selectedProject?.id) {
      return;
    }

    this.showExportMenu = !this.showExportMenu;
  }

  closeProjectExportChooser(): void {
    this.showExportMenu = false;
  }

  exportProjectAs(format: 'pdf' | 'excel'): void {
    if (format === 'pdf') {
      this.exportSelectedProjectToPdf();
    } else {
      this.exportSelectedProjectToExcel();
    }

    this.showExportMenu = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const clickedInsideExportArea = !!target.closest('.project-export-wrap');
    if (!clickedInsideExportArea) {
      this.showExportMenu = false;
    }

    const clickedInsideUserStoryActions = !!target.closest('.user-story-actions-menu');
    if (!clickedInsideUserStoryActions) {
      this.closeUserStoryMenu();
    }
  }

  backToProjectsList(): void {
    const selectedServiceId = this.selectedProject?.serviceId;
    this.selectedServiceFilter = selectedServiceId != null ? Number(selectedServiceId) : null;
    if (this.selectedServiceFilter !== null && Number.isNaN(this.selectedServiceFilter)) {
      this.selectedServiceFilter = null;
    }

    this.selectedProject = null;
    this.showExportMenu = false;
    this.selectedProjectMembers = [];
    this.projectSprints = [];
    this.projectUserStories = [];
    this.resetDetailForms();
    this.applyServiceFilter();
  }

  goBackToServicesList(): void {
    this.router.navigate(['/AdminDashboard'], { queryParams: { tab: 'services' } });
  }

  setDetailTab(tab: 'overview' | 'stories' | 'sprints'): void {
    this.detailTab = tab;
    if (!this.selectedProject?.id) {
      return;
    }

    if (tab === 'sprints') {
      this.loadProjectSprints(this.selectedProject.id);
      return;
    }

    if (tab === 'stories') {
      this.loadProjectUserStories(this.selectedProject.id);
    }
  }

  
  openKanbanBoard(): void {
    if (!this.canViewKanban) {
      this.error = 'The Kanban board is not available for the Team Manager.';
      return;
    }

    const projectId = this.selectedProject?.id;
    this.router.navigate(['/kanban'], { queryParams: projectId ? { projectId } : {} });
  }

  openProjectBacklog(): void {
    const projectId = this.selectedProject?.id;
    this.router.navigate(['/Backlog'], { queryParams: projectId ? { projectId } : {} });
  }

  validateForm(): boolean {
    if (!this.newProject.name || this.newProject.name.trim() === '') {
      this.error = 'Project name is required';
      return false;
    }
    if (!this.newProject.projectManagerId || this.newProject.projectManagerId === 0) {
      this.error = 'Project Manager is required';
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
    this.onProjectDatesChange();
  }

  onProjectDatesChange(): void {
    this.newProject.estimatedDuration = this.calculateEstimatedDurationDays(this.newProject.startDate, this.newProject.endDate);
  }

  onDetailSprintDatesChange(): void {
    const minDate = this.detailSprintMinDateInput;
    const maxDate = this.detailSprintMaxDateInput;

    if (!this.isDateInRange(this.newDetailSprint.startDate, minDate, maxDate)) {
      this.newDetailSprint.startDate = minDate || this.newDetailSprint.startDate;
    }

    if (!this.isDateInRange(this.newDetailSprint.endDate, minDate, maxDate) || this.newDetailSprint.endDate < this.newDetailSprint.startDate) {
      this.newDetailSprint.endDate = this.newDetailSprint.startDate;
    }

    this.newDetailSprint.estimatedDuration = this.calculateEstimatedDurationDays(this.newDetailSprint.startDate, this.newDetailSprint.endDate);
  }

  onDetailUserStoryDatesChange(): void {
    const minDate = this.detailUserStoryMinDateInput;
    const maxDate = this.detailUserStoryMaxDateInput;

    if (!this.isDateInRange(this.newDetailUserStory.startDate, minDate, maxDate)) {
      this.newDetailUserStory.startDate = minDate || this.newDetailUserStory.startDate;
    }

    if (!this.isDateInRange(this.newDetailUserStory.endDate, minDate, maxDate)
      || this.newDetailUserStory.endDate < this.newDetailUserStory.startDate) {
      this.newDetailUserStory.endDate = this.newDetailUserStory.startDate;
    }

    this.newDetailUserStory.estimatedDuration = Math.max(1, this.calculateEstimatedDurationDays(this.newDetailUserStory.startDate, this.newDetailUserStory.endDate));
  }

  get detailSprintMinDateInput(): string {
    if (!this.selectedProject?.startDate) {
      return '';
    }

    return this.formatDateForInput(new Date(this.selectedProject.startDate));
  }

  get detailSprintMaxDateInput(): string {
    if (!this.selectedProject?.endDate) {
      return '';
    }

    return this.formatDateForInput(new Date(this.selectedProject.endDate));
  }

  get detailUserStoryMinDateInput(): string {
    const selectedSprint = this.getSelectedDetailSprint();
    if (!selectedSprint?.startDate) {
      return '';
    }

    return this.formatDateForInput(new Date(selectedSprint.startDate));
  }

  get detailUserStoryMaxDateInput(): string {
    const selectedSprint = this.getSelectedDetailSprint();
    if (!selectedSprint?.endDate) {
      return '';
    }

    return this.formatDateForInput(new Date(selectedSprint.endDate));
  }

  onDetailUserStorySprintChange(): void {
    this.onDetailUserStoryDatesChange();
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

  getStateLabel(state: State): string {
    const labels: Record<number, string> = {
      [State.pending]: 'Pending',
      [State.todo]: 'To Do',
      [State.inProgress]: 'In Progress',
      [State.done]: 'Done',
      [State.validated]: 'Validated'
    };

    return labels[Number(state)] ?? 'Unknown';
  }

  getProjectProgress(project: project): number {
    const state = Number(project.projectState);
    const progressMap: Record<number, number> = {
      [State.pending]: 10,
      [State.todo]: 30,
      [State.inProgress]: 65,
      [State.done]: 100,
      [State.validated]: 100
    };

    return progressMap[state] ?? 0;
  }

  getMemberInitials(user: UserDto): string {
    const first = (user.firstName || '').charAt(0);
    const last = (user.lastName || '').charAt(0);
    return `${first}${last}`.toUpperCase() || 'U';
  }

  getProjectUserStoriesCount(project: project): number {
    if (this.selectedProject?.id === project.id && this.projectUserStories.length > 0) {
      return this.projectUserStories.length;
    }

    return project.userStories?.length ?? 0;
  }

  getProjectSprintsCount(project: project): number {
    if (this.selectedProject?.id === project.id && this.projectSprints.length > 0) {
      return this.projectSprints.length;
    }

    return project.sprints?.length ?? 0;
  }

  getSprintStateName(state: SprintState): string {
    const option = this.sprintStateOptions.find((item) => item.value === state);
    return option ? option.label : String(state);
  }

  getSprintStatusBadgeClasses(state: SprintState): string {
    const value = Number(state);

    if (value === SprintState.done || value === SprintState.validated) {
      return 'bg-blue-100 text-blue-700';
    }

    if (value === SprintState.inProgress) {
      return 'bg-green-100 text-green-700';
    }

    if (value === SprintState.todo) {
      return 'bg-amber-100 text-amber-700';
    }

    return 'bg-slate-100 text-slate-700';
  }

  getUserStoryStatusDisplay(story: UserStoryDto): string {
    return this.getStateLabel(this.getUserStoryStateValue(story));
  }

  getUserStoryStatusBadgeClasses(story: UserStoryDto): string {
    const normalizedState = this.getUserStoryStateValue(story);

    if (normalizedState === State.done || normalizedState === State.validated) {
      return 'bg-blue-100 text-blue-700';
    }

    if (normalizedState === State.inProgress) {
      return 'bg-green-100 text-green-700';
    }

    if (normalizedState === State.todo) {
      return 'bg-amber-100 text-amber-700';
    }

    return 'bg-slate-100 text-slate-700';
  }

  toggleSprintMenu(sprintId: number): void {
    this.openSprintMenuId = this.openSprintMenuId === sprintId ? null : sprintId;
  }

  closeSprintMenu(): void {
    this.openSprintMenuId = null;
  }

  toggleUserStoryMenu(storyId: string | number): void {
    const normalizedId = String(storyId ?? '');
    this.openUserStoryMenuId = this.openUserStoryMenuId === normalizedId ? null : normalizedId;
  }

  closeUserStoryMenu(): void {
    this.openUserStoryMenuId = null;
  }

  getUserStoryMenuId(story: UserStoryDto): string {
    return String(story.id ?? '');
  }

  getUserStoryStatusLabel(status: UserStoryStatus | State | number | undefined): string {
    return this.getStateLabel(this.mapStatusToState(status));
  }

  getProjectSprintName(sprintId: number | string | undefined): string {
    const normalizedSprintId = Number(sprintId ?? 0);
    if (!normalizedSprintId) {
      return 'No sprint';
    }

    const sprint = this.projectSprints.find((item) => Number(item.id) === normalizedSprintId);
    return sprint?.name ?? `Sprint #${normalizedSprintId}`;
  }

  getSprintTaskCountInProject(sprintId: number): number {
    const normalizedSprintId = Number(sprintId);
    if (!normalizedSprintId) {
      return 0;
    }

    return this.getSelectedProjectTasks()
      .filter((task) => Number(task.sprintId ?? 0) === normalizedSprintId)
      .length;
  }

  toggleDetailSprintForm(): void {
    this.showCreateSprintFormInDetails = !this.showCreateSprintFormInDetails;
    if (!this.showCreateSprintFormInDetails) {
      this.resetDetailSprintForm();
    }
  }

  startEditDetailSprint(sprint: Sprint): void {
    this.isEditingSprintInDetails = true;
    this.editingSprintDetailId = sprint.id;
    this.showCreateSprintFormInDetails = true;

    this.newDetailSprint = {
      name: sprint.name,
      description: sprint.description || '',
      startDate: this.formatDateForInput(new Date(sprint.startDate)),
      endDate: this.formatDateForInput(new Date(sprint.endDate)),
      estimatedDuration: sprint.estimatedDuration,
      sprintState: sprint.sprintState,
      projectId: sprint.projectId,
    };

    this.onDetailSprintDatesChange();
  }

  createDetailSprint(): void {
    if (!this.validateDetailSprintForm() || !this.selectedProject?.id) {
      return;
    }

    this.onDetailSprintDatesChange();

    this.loading = true;
    this.error = null;

    const sprintData: CreateSprintDto = {
      name: this.newDetailSprint.name,
      description: this.newDetailSprint.description,
      startDate: new Date(this.newDetailSprint.startDate),
      endDate: new Date(this.newDetailSprint.endDate),
      estimatedDuration: Number(this.newDetailSprint.estimatedDuration),
      sprintState: Number(this.newDetailSprint.sprintState),
      projectId: this.selectedProject.id
    };

    this.sprintService.createSprint(sprintData).subscribe({
      next: () => {
        this.successMessage = 'Sprint created successfully!';
        this.loadProjectSprints(this.selectedProject!.id!);
        this.resetDetailSprintForm();
        this.showCreateSprintFormInDetails = false;
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

  updateDetailSprint(): void {
    if (!this.validateDetailSprintForm() || !this.editingSprintDetailId || !this.selectedProject?.id) {
      return;
    }

    this.onDetailSprintDatesChange();

    this.loading = true;
    this.error = null;

    const updateData: UpdateSprintDto = {
      id: this.editingSprintDetailId,
      name: this.newDetailSprint.name,
      description: this.newDetailSprint.description,
      startDate: new Date(this.newDetailSprint.startDate),
      endDate: new Date(this.newDetailSprint.endDate),
      estimatedDuration: Number(this.newDetailSprint.estimatedDuration),
      sprintState: Number(this.newDetailSprint.sprintState),
      projectId: this.selectedProject.id
    };

    this.sprintService.updateSprint(this.editingSprintDetailId, updateData).subscribe({
      next: () => {
        this.successMessage = 'Sprint updated successfully!';
        this.loadProjectSprints(this.selectedProject!.id!);
        this.resetDetailSprintForm();
        this.showCreateSprintFormInDetails = false;
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

  deleteDetailSprint(sprintId: number): void {
    const sprint = this.projectSprints.find((item) => item.id === sprintId);
    if (!this.canDeleteSprint(sprint)) {
      alert('You cannot delete this sprint unless it is pending.');
      return;
    }

    if (!confirm('Are you sure you want to delete this sprint? This action cannot be undone.')) {
      return;
    }

    if (!this.selectedProject?.id) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.sprintService.deleteSprint(sprintId).subscribe({
      next: () => {
        this.successMessage = 'Sprint deleted successfully!';
        this.loadProjectSprints(this.selectedProject!.id!);
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

  viewSprintPage(sprint: Sprint): void {
    this.router.navigate(['/SprintView'], { queryParams: { sprintId: sprint.id, projectId: sprint.projectId } });
  }

  toggleDetailUserStoryForm(): void {
    if (!this.canManageUserStories) {
      this.error = 'You are not allowed to manage user stories.';
      return;
    }

    this.showCreateUserStoryFormInDetails = !this.showCreateUserStoryFormInDetails;
    if (!this.showCreateUserStoryFormInDetails) {
      this.resetDetailUserStoryForm();
    }
  }

  startEditDetailUserStory(story: UserStoryDto): void {
    if (!this.canManageUserStories) {
      this.error = 'You are not allowed to manage user stories.';
      return;
    }

    this.isEditingUserStoryInDetails = true;
    this.editingUserStoryDetailId = story.id;
    this.showCreateUserStoryFormInDetails = true;

    const rawStartDate = (story as any)?.startDate;
    const rawEndDate = (story as any)?.endDate;

    this.newDetailUserStory = {
      name: story.name || story.title || '',
      description: story.description || '',
      startDate: rawStartDate ? this.formatDateForInput(new Date(rawStartDate)) : this.newDetailUserStory.startDate,
      endDate: rawEndDate ? this.formatDateForInput(new Date(rawEndDate)) : this.newDetailUserStory.endDate,

      estimatedDuration: story.estimatedDuration ?? 1,
      userStoryState: story.userStoryState ?? this.mapStatusToState(story.status),
      sprintId: String(story.sprintId ?? ''),
      projectId: this.selectedProject?.id ?? 0
    };

    this.onDetailUserStoryDatesChange();
  }

  createDetailUserStory(): void {
    if (!this.canManageUserStories) {
      this.error = 'You are not allowed to manage user stories.';
      return;
    }

    this.onDetailUserStoryDatesChange();

    if (!this.validateDetailUserStoryForm() || !this.selectedProject?.id) {
      return;
    }

    const normalizedName = String(this.newDetailUserStory.name ?? '').trim();
    if (this.hasDuplicateDetailUserStoryName(normalizedName)) {
      this.error = 'A user story with this name already exists in this project.';
      return;
    }

    this.loading = true;
    this.error = null;

    const request: CreateUserStoryRequest = {
      name: this.newDetailUserStory.name,
      description: this.newDetailUserStory.description,
      startDate: new Date(this.newDetailUserStory.startDate),
      endDate: new Date(this.newDetailUserStory.endDate),
      estimatedDuration: Math.max(1, Number(this.newDetailUserStory.estimatedDuration)),
      userStoryState: Number(this.newDetailUserStory.userStoryState),
      projectId: this.selectedProject.id,
      sprintId: Number(this.newDetailUserStory.sprintId),
    };

    this.userStoryService.create(request).subscribe({
      next: (response: any) => {
        this.prependCreatedUserStoryPreview(request, response);
        this.successMessage = 'User story created successfully!';
        this.loadProjectUserStories(this.selectedProject!.id!);
        this.resetDetailUserStoryForm();
        this.showCreateUserStoryFormInDetails = false;
        this.detailTab = 'stories';
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        this.error = 'Failed to create user story: ' + (err.error?.message || err.message);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  updateDetailUserStory(): void {
    if (!this.canManageUserStories) {
      this.error = 'You are not allowed to manage user stories.';
      return;
    }

    this.onDetailUserStoryDatesChange();

    if (!this.validateDetailUserStoryForm() || !this.editingUserStoryDetailId || !this.selectedProject?.id) {
      return;
    }

    const normalizedName = String(this.newDetailUserStory.name ?? '').trim();
    if (this.hasDuplicateDetailUserStoryName(normalizedName, this.editingUserStoryDetailId)) {
      this.error = 'A user story with this name already exists in this project.';
      return;
    }

    this.loading = true;
    this.error = null;

    const request: UpdateUserStoryRequest = {
      id: Number(this.editingUserStoryDetailId),
      name: this.newDetailUserStory.name,
      description: this.newDetailUserStory.description,
      
    
      estimatedDuration: Math.max(1, Number(this.newDetailUserStory.estimatedDuration)),
      userStoryState: Number(this.newDetailUserStory.userStoryState),
      projectId: this.selectedProject.id,
      sprintId: Number(this.newDetailUserStory.sprintId),
    };

    this.userStoryService.update(Number(this.editingUserStoryDetailId), request).subscribe({
      next: () => {
        this.successMessage = 'User story updated successfully!';
        this.loadProjectUserStories(this.selectedProject!.id!);
        this.resetDetailUserStoryForm();
        this.showCreateUserStoryFormInDetails = false;
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        this.error = 'Failed to update user story: ' + (err.error?.message || err.message);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteDetailUserStory(storyId: string): void {
    if (!this.canManageUserStories) {
      this.error = 'You are not allowed to manage user stories.';
      return;
    }

    const normalizedStoryId = String(storyId ?? '').trim();
    if (!normalizedStoryId) {
      this.error = 'Invalid user story identifier.';
      return;
    }

    if (normalizedStoryId.startsWith('tmp-')) {
      this.projectUserStories = this.projectUserStories.filter((story) => String(story.id) !== normalizedStoryId);
      this.successMessage = 'User story removed from the local preview.';
      this.cdr.detectChanges();
      return;
    }

    if (!confirm('Are you sure you want to delete this user story? This action cannot be undone.')) {
      return;
    }

    if (!this.selectedProject?.id) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.userStoryService.delete(normalizedStoryId).subscribe({
      next: () => {
        this.successMessage = 'User story deleted successfully!';
        this.loadProjectUserStories(this.selectedProject!.id!);
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        this.error = 'Failed to delete user story: ' + (err.error?.message || err.message);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewUserStoryPage(story: UserStoryDto): void {
    this.router.navigate(['/UserStoryView'], {
      queryParams: {
        userStoryId: story.id,
        sprintId: story.sprintId,
        projectId: this.selectedProject?.id
      }
    });
  }

  getProjectTasksCount(project: project): number {
   
    if (this.selectedProject?.id === project.id && this.projectUserStories.length > 0) {
      return this.projectUserStories.reduce((count, story) => count + (story.taskCount ?? 0), 0);
    }

   
    return 0;
  }

  getProjectMembersCount(project: project): number {
    if (this.selectedProject?.id === project.id) {
      const uniqueIds = new Set<number>();
      this.selectedProjectMembers.forEach((member) => uniqueIds.add(member.id));

      const manager = this.users.find((item) => item.id === project.projectManagerId);
      if (manager) {
        uniqueIds.add(manager.id);
      }

      if (uniqueIds.size > 0) {
        return uniqueIds.size;
      }
    }

    return project.projectManagerId ? 1 : 0;
  }

  getStatusBadgeClasses(state: State): string {
    const value = Number(state);
    if (value === State.done || value === State.validated) {
      return 'text-green-700 bg-green-100';
    }

    if (value === State.inProgress) {
      return 'text-blue-700 bg-blue-100';
    }

    if (value === State.todo) {
      return 'text-amber-700 bg-amber-100';
    }

    return 'text-slate-700 bg-slate-100';
  }

  canDeleteProject(project?: project | null): boolean {
    return !!project && Number(project.projectState) === State.pending;
  }

  canDeleteSprint(sprint?: Sprint | null): boolean {
    return !!sprint && Number(sprint.sprintState) === SprintState.pending;
  }

  canDeleteUserStory(story?: UserStoryDto | null): boolean {
    if (!story) {
      return false;
    }

    const role = this.tokenService.getUserRole();
    if (role === AppRole.Admin || role === AppRole.ProjectManager) {
      return true;
    }

    return this.getUserStoryStateValue(story) === State.pending;
  }

  private loadProjectSprints(projectId: number): void {
    this.sprintService.getSprintsByProjectId(projectId).subscribe({
      next: (data) => {
        this.projectSprints = data;
        if (!this.isEditingUserStoryInDetails && !this.newDetailUserStory.sprintId && data.length > 0) {
          this.newDetailUserStory.sprintId = String(data[0].id);
        }
        this.onDetailUserStorySprintChange();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load project sprints: ' + (err.error?.message || err.message);
      }
    });
  }

  private openRequestedProjectIfNeeded(): void {
    if (!this.requestedProjectId || Number.isNaN(this.requestedProjectId) || this.allProjects.length === 0) {
      return;
    }

    const projectToOpen = this.allProjects.find((item) => item.id === this.requestedProjectId);
    if (!projectToOpen) {
      return;
    }

    this.viewProjectDetails(projectToOpen);
    this.setDetailTab(this.requestedDetailTab);
    this.requestedProjectId = null;
    this.requestedDetailTab = 'overview';
  }

  private loadProjectUserStories(projectId: number): void {
    this.userStoryService.getByProjectId(projectId).subscribe({
      next: (data) => {
        this.projectUserStories = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load project user stories: ' + (err.error?.message || err.message);
      }
    });
  }

  private validateDetailSprintForm(): boolean {
    if (!this.newDetailSprint.name || this.newDetailSprint.name.trim() === '') {
      this.error = 'Sprint name is required';
      return false;
    }

    const startDate = new Date(this.newDetailSprint.startDate);
    const endDate = new Date(this.newDetailSprint.endDate);
    if (startDate >= endDate) {
      this.error = 'Sprint end date must be after start date';
      return false;
    }

    if (!this.isDateInRange(this.newDetailSprint.startDate, this.detailSprintMinDateInput, this.detailSprintMaxDateInput)
      || !this.isDateInRange(this.newDetailSprint.endDate, this.detailSprintMinDateInput, this.detailSprintMaxDateInput)) {
      this.error = 'Sprint dates must be within the selected project date interval';
      return false;
    }

    return true;
  }

  private validateDetailUserStoryForm(): boolean {
    if (!this.newDetailUserStory.name || this.newDetailUserStory.name.trim() === '') {
      this.error = 'User story name is required';
      return false;
    }

    if (!this.newDetailUserStory.sprintId || this.newDetailUserStory.sprintId === '') {
      this.error = 'Sprint is required for user story';
      return false;
    }

    const startDate = new Date(this.newDetailUserStory.startDate);
    const endDate = new Date(this.newDetailUserStory.endDate);
    if (startDate > endDate) {
      this.error = 'User story end date must be on or after start date';
      return false;
    }

    if (!this.isDateInRange(this.newDetailUserStory.startDate, this.detailUserStoryMinDateInput, this.detailUserStoryMaxDateInput)
      || !this.isDateInRange(this.newDetailUserStory.endDate, this.detailUserStoryMinDateInput, this.detailUserStoryMaxDateInput)) {
      this.error = 'User story dates must be within the selected sprint date interval';
      return false;
    }

    return true;
  }

  private hasDuplicateDetailUserStoryName(name: string, excludeId?: string | null): boolean {
    const normalized = String(name ?? '').trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    const excluded = excludeId != null ? String(excludeId) : null;

    return this.projectUserStories.some((story) => {
      const storyId = String(story.id ?? '');
      if (excluded !== null && storyId === excluded) {
        return false;
      }

      const candidate = String(story.name ?? story.title ?? '').trim().toLowerCase();
      return candidate === normalized;
    });
  }

  private getSelectedDetailSprint(): Sprint | undefined {
    const sprintId = Number(this.newDetailUserStory.sprintId);
    if (!sprintId || Number.isNaN(sprintId)) {
      return undefined;
    }

    return this.projectSprints.find((sprint) => Number(sprint.id) === sprintId);
  }

  private isDateInRange(dateValue: string, minDate: string, maxDate: string): boolean {
    if (!dateValue) {
      return false;
    }

    if (minDate && dateValue < minDate) {
      return false;
    }

    if (maxDate && dateValue > maxDate) {
      return false;
    }

    return true;
  }

  private resetDetailForms(): void {
    this.resetDetailSprintForm();
    this.resetDetailUserStoryForm();
    this.showCreateSprintFormInDetails = false;
    this.showCreateUserStoryFormInDetails = false;
  }

  private resetDetailSprintForm(): void {
    this.newDetailSprint = {
      name: '',
      description: '',
      startDate: this.formatDateForInput(new Date()),
      endDate: this.formatDateForInput(new Date()),
      estimatedDuration: 0,
      sprintState: SprintState.pending,
      projectId: this.selectedProject?.id ?? 0,
    };

    this.isEditingSprintInDetails = false;
    this.editingSprintDetailId = null;
    this.onDetailSprintDatesChange();
  }

  private resetDetailUserStoryForm(): void {
    this.newDetailUserStory = {
      name: '',
      description: '',
      startDate: this.formatDateForInput(new Date()),
      endDate: this.formatDateForInput(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      estimatedDuration: 1,
      userStoryState: State.todo,
      sprintId: this.projectSprints.length > 0 ? String(this.projectSprints[0].id) : '',
      projectId: this.selectedProject?.id ?? 0
    };

    this.isEditingUserStoryInDetails = false;
    this.editingUserStoryDetailId = null;
    this.onDetailUserStoryDatesChange();
  }

  private prependCreatedUserStoryPreview(request: CreateUserStoryRequest, response: any): void {
    const createdId = this.extractCreatedUserStoryId(response);

    const preview: UserStoryDto = {
      id: createdId,
      name: request.name,
      title: request.name,
      description: request.description,
 
      estimatedDuration: request.estimatedDuration,
      userStoryState: request.userStoryState,
      acceptanceCriteria: '',
      storyPoints: 0,
  
      status: State.todo,
      sprintId: String(request.sprintId),
      taskCount: 0,
      completedTaskCount: 0,
      createdAt: new Date(),
    };

    this.projectUserStories = [preview, ...this.projectUserStories];
  }

  private extractCreatedUserStoryId(response: any): string {
    if (typeof response === 'string' || typeof response === 'number') {
      return String(response);
    }

    if (response?.id !== undefined && response?.id !== null) {
      return String(response.id);
    }

    return `tmp-${Date.now()}`;
  }

  private mapStatusToState(status: UserStoryStatus | State | number | undefined): State {
    if (status === null || status === undefined) {
      return State.todo;
    }

    const numericStatus = Number(status);
    if (Number.isFinite(numericStatus) && numericStatus >= State.pending && numericStatus <= State.validated) {
      return numericStatus as State;
    }

    const normalizedStatus = String(status).trim().toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
        return State.pending;
      case 'todo':
      case 'to do':
        return State.todo;
      case 'inprogress':
      case 'in progress':
      case 'review':
      case 'testing':
        return State.inProgress;
      case 'done':
        return State.done;
      case 'validated':
        return State.validated;
    }

    return State.todo;
  }

  private getUserStoryStateValue(story: UserStoryDto): State {
    const numericState = Number(story.userStoryState);
    if (Number.isFinite(numericState)) {
      return numericState as State;
    }

    return this.mapStatusToState(story.status);
  }

  private loadSelectedProjectMembers(project: project): void {
    if (!project.teamId) {
      const manager = this.users.find((item) => item.id === project.projectManagerId);
      this.selectedProjectMembers = manager ? [manager] : [];
      return;
    }

    this.teamService.getMembersByTeamId(project.teamId).subscribe({
      next: (members: TeamUser[]) => {
        const mappedMembers = members
          .map((member) => {
            if (member.user) {
              return {
                id: member.user.id,
                firstName: member.user.firstName,
                lastName: member.user.lastName,
                email: member.user.email,
                role: member.user.role?.toString()
              } as UserDto;
            }

            const fallback = this.users.find((item) => item.id === member.userId);
            return fallback ?? null;
          })
          .filter((item): item is UserDto => item !== null);

        this.selectedProjectMembers = mappedMembers;
        this.cdr.detectChanges();
      },
      error: () => {
        const manager = this.users.find((item) => item.id === project.projectManagerId);
        this.selectedProjectMembers = manager ? [manager] : [];
      }
    });
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

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US');
  }

  private exportSelectedProjectToExcel(): void {
    const projectItem = this.selectedProject;
    if (!projectItem?.id) {
      return;
    }

    const sprints = this.projectSprints ?? [];
    const stories = this.projectUserStories ?? [];
    const projectTasks = this.getSelectedProjectTasks();

    // Sheet 1: Project Overview
    const projectOverviewRows: string[][] = [];
    projectOverviewRows.push(['PROJECT OVERVIEW']);
    projectOverviewRows.push([]);
    projectOverviewRows.push(['Project Name', projectItem.name]);
    projectOverviewRows.push(['Status', this.getStateLabel(projectItem.projectState)]);
    projectOverviewRows.push(['Description', projectItem.description || 'N/A']);
    projectOverviewRows.push(['Service', this.getServiceName(projectItem.serviceId)]);
    projectOverviewRows.push(['Project Manager', this.getUserName(projectItem.projectManagerId)]);
    projectOverviewRows.push(['Start Date', projectItem.startDate ? this.formatDate(new Date(projectItem.startDate)) : '-']);
    projectOverviewRows.push(['End Date', projectItem.endDate ? this.formatDate(new Date(projectItem.endDate)) : '-']);
    projectOverviewRows.push(['Estimated Duration (days)', String(projectItem.estimatedDuration || '-')]);
    projectOverviewRows.push(['Progress', `${this.getProjectProgress(projectItem)}%`]);
    projectOverviewRows.push([]);
    projectOverviewRows.push(['STATISTICS']);
    projectOverviewRows.push(['Total Sprints', String(sprints.length)]);
    projectOverviewRows.push(['Total User Stories', String(stories.length)]);
    projectOverviewRows.push(['Total Tasks', String(projectTasks.length)]);
    projectOverviewRows.push(['Completed Tasks', String(projectTasks.filter(t => this.mapTaskStatus(t.status) === 'done' || this.mapTaskStatus(t.status) === 'validated').length)]);

    // Sheet 2: Sprints & Stories
    const sprintsStoriesRows: string[][] = [];
    sprintsStoriesRows.push(['SPRINTS & USER STORIES']);
    sprintsStoriesRows.push([]);
    sprintsStoriesRows.push([
      'Sprint Name',
      'Sprint Status',
      'Sprint Duration',
      'Sprint Start Date',
      'Sprint End Date',
      'User Story Name',
      'Story Status',
      'Story Points',
      'Story Duration',
      'Story Assigned To',
      'Tasks Count',
      'Completed Tasks',
      'Acceptance Criteria'
    ]);

    sprints.forEach((sprint) => {
      const sprintStories = stories.filter((story) => Number(story.sprintId) === Number(sprint.id));
      
      if (sprintStories.length === 0) {
        sprintsStoriesRows.push([
          sprint.name,
          this.getSprintStateName(sprint.sprintState),
          String(sprint.estimatedDuration || '-'),
          sprint.startDate ? this.formatDate(new Date(sprint.startDate)) : '-',
          sprint.endDate ? this.formatDate(new Date(sprint.endDate)) : '-',
          '-', '-', '-', '-', '-', '-', '-', '-'
        ]);
      } else {
        sprintStories.forEach((story, index) => {
          const storyTasks = projectTasks.filter((task) => Number(task.userStoryId) === Number(story.id));
          sprintsStoriesRows.push([
            index === 0 ? sprint.name : '',
            index === 0 ? this.getSprintStateName(sprint.sprintState) : '',
            index === 0 ? String(sprint.estimatedDuration || '-') : '',
            index === 0 ? (sprint.startDate ? this.formatDate(new Date(sprint.startDate)) : '-') : '',
            index === 0 ? (sprint.endDate ? this.formatDate(new Date(sprint.endDate)) : '-') : '',
            story.name || story.title,
            this.getUserStoryStatusDisplay(story),
            String(story.storyPoints || '-'),
            String(story.estimatedDuration || '-'),
            story.assignedToName || 'Unassigned',
            String(story.taskCount || 0),
            String(story.completedTaskCount || 0),
            story.acceptanceCriteria || '-'
          ]);
        });
      }
    });

    // Sheet 3: Tasks
    const tasksRows: string[][] = [];
    tasksRows.push(['TASKS']);
    tasksRows.push([]);
    tasksRows.push([
      'User Story',
      'Sprint',
      'Task Title',
      'Task Status',
      'Description',
      'Estimated Hours',
      'Actual Hours',
      'Complexity',
      'Assigned To',
      'Start Date',
      'End Date',
      'Created Date'
    ]);

    projectTasks.forEach((task) => {
      const story = stories.find(s => Number(s.id) === Number(task.userStoryId));
      const sprint = sprints.find(s => Number(s.id) === Number(task.sprintId));
      
      tasksRows.push([
        story?.name || story?.title || '-',
        sprint?.name || '-',
        task.title,
        this.getTaskStatusLabel(task.status),
        task.description || '-',
        String(task.estimatedHours || '-'),
        String(task.actualHours || '-'),
        String(task.complexity || '-'),
        task.assignedToName || 'Unassigned',
        task.startDate ? this.formatDate(new Date(task.startDate)) : '-',
        task.endDate ? this.formatDate(new Date(task.endDate)) : '-',
        task.createdAt ? this.formatDate(new Date(task.createdAt)) : '-'
      ]);
    });

    // Combine all sheets
    const allRows = [
      ...projectOverviewRows,
      [],
      [],
      ...sprintsStoriesRows,
      [],
      [],
      ...tasksRows
    ];

    const csvContent = allRows.map((row) => row.map((cell) => this.escapeCsvValue(cell)).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.getExportFileBaseName()}-${this.buildTimestampSuffix()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private exportSelectedProjectToPdf(): void {
    const projectItem = this.selectedProject;
    if (!projectItem?.id) {
      return;
    }

    const sprints = this.projectSprints ?? [];
    const stories = this.projectUserStories ?? [];
    const projectTasks = this.getSelectedProjectTasks();
    const projectManagerName = this.getUserName(projectItem.projectManagerId);
    const serviceName = this.getServiceName(projectItem.serviceId);

    const formatDateFr = (dateValue: Date | string | undefined): string => {
      if (!dateValue) {
        return '-';
      }
      return new Date(dateValue).toLocaleDateString('fr-FR');
    };

    const sprintBlocksHtml = sprints.map((sprint, sprintIndex) => {
      const sprintStories = stories.filter((story) => Number(story.sprintId ?? 0) === Number(sprint.id));
      const sprintStartDate = formatDateFr(sprint.startDate);
      const sprintEndDate = formatDateFr(sprint.endDate);

      const storiesHtml = sprintStories.length > 0
        ? `
          <ul class="story-list">
            ${sprintStories.map((story) => {
              const storyName = story.name || story.title || 'User story';
              const storyTasks = projectTasks.filter((task) => Number(task.userStoryId) === Number(story.id));
              const storyCreatedDate = story.createdAt ? formatDateFr(story.createdAt) : '-';
              
              const storyDetailsHtml = `
                <div class="story-details">
                  <div class="detail-item"><strong>Description:</strong> ${this.escapeHtml(story.description || 'No description')}</div>
                  <div class="detail-item"><strong>Acceptance Criteria:</strong> ${this.escapeHtml(story.acceptanceCriteria || 'N/A')}</div>
                  <div class="detail-item"><strong>Story Points:</strong> ${story.storyPoints || '-'} | <strong>Est. Duration:</strong> ${story.estimatedDuration || '-'} days</div>
                  <div class="detail-item"><strong>Assigned To:</strong> ${this.escapeHtml(story.assignedToName || 'Unassigned')} | <strong>Progress:</strong> ${story.completedTaskCount || 0}/${story.taskCount || 0} tasks completed</div>
                  <div class="detail-item"><strong>Created:</strong> ${storyCreatedDate}</div>
                </div>
              `;

              const taskHtml = storyTasks.length > 0
                ? `
                    <ul class="task-list">
                      ${storyTasks.map((task) => {
                        const taskStartDate = task.startDate ? formatDateFr(task.startDate) : '-';
                        const taskEndDate = task.endDate ? formatDateFr(task.endDate) : '-';
                        const taskCreatedDate = task.createdAt ? formatDateFr(task.createdAt) : '-';
                        return `
                          <li>
                            <div class="task-title">• ${this.escapeHtml(task.title || 'Task')}</div>
                            <div class="task-meta">
                              <div><strong>Description:</strong> ${this.escapeHtml(task.description || 'No description')}</div>
                              <div><strong>Status:</strong> ${this.getTaskStatusLabel(task.status)} | <strong>Complexity:</strong> ${task.complexity || '-'}</div>
                              <div><strong>Est. Hours:</strong> ${task.estimatedHours || '-'} | <strong>Actual Hours:</strong> ${task.actualHours || '-'}</div>
                              <div><strong>Assigned To:</strong> ${this.escapeHtml(task.assignedToName || 'Unassigned')} | <strong>Start:</strong> ${taskStartDate} | <strong>End:</strong> ${taskEndDate}</div>
                              <div><strong>Created:</strong> ${taskCreatedDate}</div>
                            </div>
                          </li>
                        `;
                      }).join('')}
                    </ul>
                  `
                : '<p class="empty-text">No tasks assigned</p>';

              return `
                <li>
                  <div class="story-title">→ ${this.escapeHtml(storyName)}</div>
                  ${storyDetailsHtml}
                  <div class="tasks-section">
                    <p class="tasks-title">Tasks:</p>
                    ${taskHtml}
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
        `
        : '<p class="empty-text">No user stories assigned</p>';

      return `
        <section class="sprint-block">
          <h2>Sprint ${sprintIndex + 1}: ${this.escapeHtml(sprint.name)}</h2>
          <div class="sprint-info">
            <div><strong>Status:</strong> ${this.getSprintStateName(sprint.sprintState)} | <strong>Duration:</strong> ${sprint.estimatedDuration || '-'} days</div>
            <div><strong>Period:</strong> ${sprintStartDate} to ${sprintEndDate}</div>
            <div><strong>Description:</strong> ${this.escapeHtml(sprint.description || 'No description')}</div>
          </div>
          <div class="stories-section">
            <p class="stories-title">User Stories:</p>
            ${storiesHtml}
          </div>
        </section>
      `;
    }).join('');

    const printWindow = window.open('', '_blank', 'width=1400,height=900');
    if (!printWindow) {
      this.error = 'Popup blocked. Please allow popups for this site to open PDF export.';
      return;
    }

    const projectDescription = projectItem.description || 'No description provided';
    const projectStartDate = formatDateFr(projectItem.startDate);
    const projectEndDate = formatDateFr(projectItem.endDate);

    printWindow.document.write(`
      <html>
      <head>
        <title>${this.escapeHtml(this.getExportFileBaseName())}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 30px;
            color: #1f2937;
            line-height: 1.6;
            background-color: #f9fafb;
          }
          
          .header {
            border-bottom: 3px solid #2563eb;
            margin-bottom: 30px;
            padding-bottom: 20px;
          }
          
          h1 {
            font-size: 32px;
            font-weight: 900;
            color: #1e293b;
            margin-bottom: 10px;
          }
          
          .project-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f3f4f6;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
          }
          
          .summary-item {
            font-size: 14px;
            margin: 5px 0;
          }
          
          .summary-item strong {
            color: #2563eb;
            min-width: 120px;
            display: inline-block;
          }
          
          .project-description {
            margin: 15px 0;
            padding: 15px;
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
            border-radius: 4px;
            line-height: 1.5;
          }
          
          .sprint-block {
            margin-bottom: 35px;
            break-inside: avoid;
          }
          
          .sprint-block h2 {
            font-size: 22px;
            color: #1e40af;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #3b82f6;
          }
          
          .sprint-info {
            padding: 12px 15px;
            background-color: #ecf0ff;
            border-left: 4px solid #3b82f6;
            margin-bottom: 15px;
            border-radius: 4px;
            font-size: 14px;
            line-height: 1.8;
          }
          
          .sprint-info div {
            margin: 5px 0;
          }
          
          .stories-section {
            margin-top: 15px;
          }
          
          .stories-title {
            font-size: 16px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 10px;
            padding-left: 5px;
            border-left: 3px solid #10b981;
          }
          
          .story-list {
            list-style: none;
            margin-left: 0;
            padding: 0;
          }
          
          .story-list li {
            margin-bottom: 15px;
            padding: 12px;
            background-color: #f5f5f5;
            border-left: 4px solid #10b981;
            border-radius: 4px;
            break-inside: avoid;
          }
          
          .story-title {
            font-size: 15px;
            font-weight: 700;
            color: #047857;
            margin-bottom: 8px;
          }
          
          .story-details {
            font-size: 13px;
            margin: 8px 0;
            padding: 8px;
            background-color: #f0fdf4;
            border-radius: 3px;
          }
          
          .detail-item {
            margin: 4px 0;
            line-height: 1.4;
          }
          
          .detail-item strong {
            color: #065f46;
          }
          
          .tasks-section {
            margin-top: 12px;
            padding-left: 10px;
          }
          
          .tasks-title {
            font-size: 14px;
            font-weight: 700;
            color: #ea580c;
            margin-bottom: 8px;
            padding-left: 5px;
            border-left: 3px solid #f97316;
          }
          
          .task-list {
            list-style: none;
            margin: 8px 0;
            padding: 0;
          }
          
          .task-list li {
            margin-bottom: 10px;
            padding: 10px;
            background-color: #fef3c7;
            border-left: 3px solid #f97316;
            border-radius: 3px;
            break-inside: avoid;
          }
          
          .task-title {
            font-size: 14px;
            font-weight: 700;
            color: #92400e;
            margin-bottom: 6px;
          }
          
          .task-meta {
            font-size: 12px;
            color: #78350f;
            line-height: 1.5;
          }
          
          .task-meta div {
            margin: 3px 0;
          }
          
          .empty-text {
            font-size: 13px;
            color: #9ca3af;
            font-style: italic;
            margin-left: 10px;
          }
          
          hr {
            border: 0;
            border-top: 2px solid #e5e7eb;
            margin: 30px 0;
          }
          
          @media print {
            body {
              background-color: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sprint-block {
              page-break-inside: avoid;
            }
            .story-list li {
              page-break-inside: avoid;
            }
            .task-list li {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${this.escapeHtml(projectItem.name)}</h1>
          <div class="project-summary">
            <div class="summary-item"><strong>Status:</strong> ${this.getStateLabel(projectItem.projectState)}</div>
            <div class="summary-item"><strong>Service:</strong> ${this.escapeHtml(serviceName)}</div>
            <div class="summary-item"><strong>Project Manager:</strong> ${this.escapeHtml(projectManagerName)}</div>
            <div class="summary-item"><strong>Progress:</strong> ${this.getProjectProgress(projectItem)}%</div>
            <div class="summary-item"><strong>Period:</strong> ${projectStartDate} to ${projectEndDate}</div>
            <div class="summary-item"><strong>Estimated Duration:</strong> ${projectItem.estimatedDuration || '-'} days</div>
          </div>
        </div>
        
        <div class="project-description">
          <strong>Description:</strong><br/>
          ${this.escapeHtml(projectDescription)}
        </div>
        
        <hr />
        
        ${sprintBlocksHtml || '<p class="empty-text">No sprints assigned</p>'}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 150);
  }

  private buildSelectedProjectExportRows(): string[][] {
    const projectItem = this.selectedProject;
    if (!projectItem?.id) {
      return [];
    }

    const headers = [
      'Project Name',
      'Project State',
      'Project Description',
      'Project Start Date',
      'Project End Date',
      'Project Duration (days)',
      'Project Manager',
      'Service',
      'Sprint Name',
      'Sprint State',
      'Sprint Description',
      'Sprint Duration (days)',
      'Sprint Start Date',
      'Sprint End Date',
      'User Story Name',
      'User Story State',
      'User Story Description',
      'Acceptance Criteria',
      'Story Points',
      'Story Est. Duration (days)',
      'Story Assigned To',
      'Story Task Count',
      'Story Completed Tasks',
      'Story Created Date',
      'Task Title',
      'Task State',
      'Task Description',
      'Task Est. Hours',
      'Task Actual Hours',
      'Task Complexity',
      'Task Assigned To',
      'Task Start Date',
      'Task End Date',
      'Task Created Date'
    ];

    const rows: string[][] = [headers];
    const projectSprints = this.projectSprints;
    const projectStories = this.projectUserStories;
    const projectTasks = this.getSelectedProjectTasks();
    const projectManagerName = this.getUserName(projectItem.projectManagerId);
    const serviceName = this.getServiceName(projectItem.serviceId);
    const projectStartDate = projectItem.startDate ? this.formatDate(new Date(projectItem.startDate)) : '-';
    const projectEndDate = projectItem.endDate ? this.formatDate(new Date(projectItem.endDate)) : '-';

    if (projectSprints.length === 0 && projectStories.length === 0) {
      rows.push([
        projectItem.name,
        this.getStateLabel(projectItem.projectState),
        projectItem.description || '-',
        projectStartDate,
        projectEndDate,
        String(projectItem.estimatedDuration || '-'),
        projectManagerName,
        serviceName,
        '-', '-', '-', '-', '-', '-',
        '-', '-', '-', '-', '-', '-', '-', '-', '-', '-',
        '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'
      ]);
      return rows;
    }

    projectSprints.forEach((sprint) => {
      const sprintStories = projectStories.filter((story) => Number(story.sprintId) === Number(sprint.id));
      const sprintStartDate = sprint.startDate ? this.formatDate(new Date(sprint.startDate)) : '-';
      const sprintEndDate = sprint.endDate ? this.formatDate(new Date(sprint.endDate)) : '-';

      if (sprintStories.length === 0) {
        rows.push([
          projectItem.name,
          this.getStateLabel(projectItem.projectState),
          projectItem.description || '-',
          projectStartDate,
          projectEndDate,
          String(projectItem.estimatedDuration || '-'),
          projectManagerName,
          serviceName,
          sprint.name,
          this.getSprintStateName(sprint.sprintState),
          sprint.description || '-',
          String(sprint.estimatedDuration || '-'),
          sprintStartDate,
          sprintEndDate,
          '-', '-', '-', '-', '-', '-', '-', '-', '-', '-',
          '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'
        ]);
        return;
      }

      sprintStories.forEach((story) => {
        const storyTasks = projectTasks.filter((task) => Number(task.userStoryId) === Number(story.id));
        const storyAssignedName = story.assignedToName || '-';
        const storyCreatedDate = story.createdAt ? this.formatDate(new Date(story.createdAt)) : '-';
        const storyCompletedCount = story.completedTaskCount || 0;

        if (storyTasks.length === 0) {
          rows.push([
            projectItem.name,
            this.getStateLabel(projectItem.projectState),
            projectItem.description || '-',
            projectStartDate,
            projectEndDate,
            String(projectItem.estimatedDuration || '-'),
            projectManagerName,
            serviceName,
            sprint.name,
            this.getSprintStateName(sprint.sprintState),
            sprint.description || '-',
            String(sprint.estimatedDuration || '-'),
            sprintStartDate,
            sprintEndDate,
            story.name || story.title,
            this.getUserStoryStatusDisplay(story),
            story.description || '-',
            story.acceptanceCriteria || '-',
            String(story.storyPoints || '-'),
            String(story.estimatedDuration || '-'),
            storyAssignedName,
            String(story.taskCount || '-'),
            String(storyCompletedCount),
            storyCreatedDate,
            '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'
          ]);
          return;
        }

        storyTasks.forEach((task) => {
          const taskAssignedName = task.assignedToName || '-';
          const taskStartDate = task.startDate ? this.formatDate(new Date(task.startDate)) : '-';
          const taskEndDate = task.endDate ? this.formatDate(new Date(task.endDate)) : '-';
          const taskCreatedDate = task.createdAt ? this.formatDate(new Date(task.createdAt)) : '-';

          rows.push([
            projectItem.name,
            this.getStateLabel(projectItem.projectState),
            projectItem.description || '-',
            projectStartDate,
            projectEndDate,
            String(projectItem.estimatedDuration || '-'),
            projectManagerName,
            serviceName,
            sprint.name,
            this.getSprintStateName(sprint.sprintState),
            sprint.description || '-',
            String(sprint.estimatedDuration || '-'),
            sprintStartDate,
            sprintEndDate,
            story.name || story.title,
            this.getUserStoryStatusDisplay(story),
            story.description || '-',
            story.acceptanceCriteria || '-',
            String(story.storyPoints || '-'),
            String(story.estimatedDuration || '-'),
            storyAssignedName,
            String(story.taskCount || '-'),
            String(storyCompletedCount),
            storyCreatedDate,
            task.title,
            this.getTaskStatusLabel(task.status),
            task.description || '-',
            String(task.estimatedHours || '-'),
            String(task.actualHours || '-'),
            String(task.complexity || '-'),
            taskAssignedName,
            taskStartDate,
            taskEndDate,
            taskCreatedDate
          ]);
        });
      });
    });

    return rows;
  }

  private getSelectedProjectTasks(): TaskDto[] {
    const projectId = this.selectedProject?.id;
    if (!projectId) {
      return [];
    }

    const storyIds = new Set(this.projectUserStories.map((story) => Number(story.id)));
    return this.tasks.filter((task) => {
      const taskProjectMatch = this.projectUserStories.some((story) => Number(story.id) === Number(task.userStoryId));
      return taskProjectMatch || storyIds.has(Number(task.userStoryId));
    });
  }

  private getTaskStatusLabel(status: TaskDto['status']): string {
    const normalized = this.mapTaskStatus(status);
    const labels: Record<string, string> = {
      pending: 'Pending',
      todo: 'To Do',
      inProgress: 'In Progress',
      done: 'Done',
      validated: 'Validated'
    };

    return labels[normalized] ?? 'Unknown';
  }

  private mapTaskStatus(status: TaskDto['status']): 'pending' | 'todo' | 'inProgress' | 'done' | 'validated' {
    if (typeof status === 'number') {
      return ['pending', 'todo', 'inProgress', 'done', 'validated'][status] as any ?? 'pending';
    }

    const normalized = String(status ?? '').trim().toLowerCase();
    if (normalized === 'inprogress') return 'inProgress';
    if (normalized === 'pending' || normalized === 'todo' || normalized === 'done' || normalized === 'validated') {
      return normalized as any;
    }

    return 'pending';
  }

  private getExportFileBaseName(): string {
    return this.selectedProject?.name ? `${this.selectedProject.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')}-project` : 'project';
  }

  private escapeCsvValue(value: string): string {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private buildTimestampSuffix(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${min}`;
  }

  formatDateForInput(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
