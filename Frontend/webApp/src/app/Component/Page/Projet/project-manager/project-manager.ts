import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService, project, CreateProjectDto, UpdateProjectDto, State } from '../Service/ProjectService';
import { TeamService, Team, TeamUser } from '../../Team/Service/TeamService';
import { ServiceService, Service } from '../../Team/Service/ServiceService';
import { UserApiService, UserDto } from '../../Team/Service/UserApiService';
import { SprintService, Sprint, CreateSprintDto, UpdateSprintDto, State as SprintState } from '../../Sprint/Service/SprintService';
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

  backToProjectsList(): void {
    const selectedServiceId = this.selectedProject?.serviceId;
    this.selectedServiceFilter = selectedServiceId != null ? Number(selectedServiceId) : null;
    if (this.selectedServiceFilter !== null && Number.isNaN(this.selectedServiceFilter)) {
      this.selectedServiceFilter = null;
    }

    this.selectedProject = null;
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
      this.error = 'The Kanban board is not available for the service manager.';
      return;
    }

    const projectId = this.selectedProject?.id;
    this.router.navigate(['/kanban'], { queryParams: projectId ? { projectId } : {} });
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

    if (!this.isDateInRange(this.newDetailUserStory.endDate, minDate, maxDate)) {
      this.newDetailUserStory.endDate = this.newDetailUserStory.startDate;
    }

    this.newDetailUserStory.estimatedDuration = this.calculateEstimatedDurationDays(this.newDetailUserStory.startDate, this.newDetailUserStory.endDate);
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

  toggleUserStoryMenu(storyId: string): void {
    this.openUserStoryMenuId = this.openUserStoryMenuId === storyId ? null : storyId;
  }

  closeUserStoryMenu(): void {
    this.openUserStoryMenuId = null;
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

    return this.projectUserStories
      .filter((story) => Number(story.sprintId) === normalizedSprintId)
      .reduce((total, story) => total + Number(story.taskCount ?? 0), 0);
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
    this.showCreateUserStoryFormInDetails = !this.showCreateUserStoryFormInDetails;
    if (!this.showCreateUserStoryFormInDetails) {
      this.resetDetailUserStoryForm();
    }
  }

  startEditDetailUserStory(story: UserStoryDto): void {
    this.isEditingUserStoryInDetails = true;
    this.editingUserStoryDetailId = story.id;
    this.showCreateUserStoryFormInDetails = true;

    this.newDetailUserStory = {
      name: story.name || story.title || '',
      description: story.description || '',
      startDate: story.startDate ? this.formatDateForInput(new Date(story.startDate)) : this.formatDateForInput(new Date()),
      endDate: story.endDate ? this.formatDateForInput(new Date(story.endDate)) : this.formatDateForInput(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      estimatedDuration: story.estimatedDuration ?? 1,
      userStoryState: story.userStoryState ?? this.mapStatusToState(story.status),
      sprintId: story.sprintId,
      projectId: this.selectedProject?.id ?? 0
    };

    this.onDetailUserStoryDatesChange();
  }

  createDetailUserStory(): void {
    if (!this.validateDetailUserStoryForm() || !this.selectedProject?.id) {
      return;
    }

    this.onDetailUserStoryDatesChange();

    this.loading = true;
    this.error = null;

    const request: CreateUserStoryRequest = {
      name: this.newDetailUserStory.name,
      description: this.newDetailUserStory.description,
      startDate: new Date(this.newDetailUserStory.startDate),
      endDate: new Date(this.newDetailUserStory.endDate),
      estimatedDuration: Number(this.newDetailUserStory.estimatedDuration),
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
    if (!this.validateDetailUserStoryForm() || !this.editingUserStoryDetailId || !this.selectedProject?.id) {
      return;
    }

    this.onDetailUserStoryDatesChange();

    this.loading = true;
    this.error = null;

    const request: UpdateUserStoryRequest = {
      id: Number(this.editingUserStoryDetailId),
      name: this.newDetailUserStory.name,
      description: this.newDetailUserStory.description,
      startDate: new Date(this.newDetailUserStory.startDate),
      endDate: new Date(this.newDetailUserStory.endDate),
      estimatedDuration: Number(this.newDetailUserStory.estimatedDuration),
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
    if (!confirm('Are you sure you want to delete this user story? This action cannot be undone.')) {
      return;
    }

    if (!this.selectedProject?.id) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.userStoryService.delete(Number(storyId)).subscribe({
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
    return !!story && this.getUserStoryStateValue(story) === State.pending;
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

    if (!this.isDateInRange(this.newDetailUserStory.startDate, this.detailUserStoryMinDateInput, this.detailUserStoryMaxDateInput)
      || !this.isDateInRange(this.newDetailUserStory.endDate, this.detailUserStoryMinDateInput, this.detailUserStoryMaxDateInput)) {
      this.error = 'User story dates must be within the selected sprint date interval';
      return false;
    }

    return true;
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
      startDate: request.startDate,
      endDate: request.endDate,
      estimatedDuration: request.estimatedDuration,
      userStoryState: request.userStoryState,
      acceptanceCriteria: '',
      storyPoints: 0,
      priority: 0,
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

  formatDateForInput(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
