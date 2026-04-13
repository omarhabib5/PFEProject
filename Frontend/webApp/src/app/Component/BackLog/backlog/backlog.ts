import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { project, ProjectService } from '../../Page/Projet/Service/ProjectService';
import { Sprint, SprintService } from '../../Page/Sprint/Service/SprintService';
import { TaskDto, TaskService } from '../../Page/Task/Service/TaskService';
import { UserStoryService } from '../../Page/UserStory/Service/UserStoryService';
import { UserStoryDto, UserStoryDetailDto } from '../../Page/UserStory/Models/userstory.model';

interface UserStoryWithTasks {
  userStory: UserStoryDto;
  tasks: TaskDto[];
}

interface SprintBacklog {
  sprint: Sprint;
  userStories: UserStoryWithTasks[];
  totalStoryPoints: number;
  velocity?: number;
}

interface ProjectBacklog {
  project: project;
  sprints: SprintBacklog[];
  totalUserStories: number;
}

@Component({
  selector: 'app-backlog',
  imports: [CommonModule],
  templateUrl:'./backlog.html',
  styleUrl: './backlog.css',
})
export class Backlog implements OnInit {
  private projectService = inject(ProjectService);
  private sprintService = inject(SprintService);
  private taskService = inject(TaskService);
  private userStoryService = inject(UserStoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
   

  loading = false;
  errorMessage = '';
  projectBacklogs: ProjectBacklog[] = [];
  selectedProjectId: number | null = null;
  filterProjectNotFound = false;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const projectIdParam = params.get('projectId');
      const parsedProjectId = Number(projectIdParam);
      this.selectedProjectId = projectIdParam && Number.isFinite(parsedProjectId) ? parsedProjectId : null;
      this.loadBacklog();
    });
  }

  loadBacklog(): void {
    this.loading = true;
    this.errorMessage = '';
    this.filterProjectNotFound = false;

    forkJoin({
      projects: this.projectService.getAllProjects().pipe(catchError(() => of([] as project[]))),
      sprints: this.sprintService.getAllSprints().pipe(catchError(() => of([] as Sprint[]))),
      userStories: this.userStoryService.getAllUserStories().pipe(catchError(() => of([] as UserStoryDto[]))),
      tasks: this.taskService.getAll().pipe(catchError(() => of([] as TaskDto[])))
    })
      .pipe(catchError(() => {
        this.errorMessage = 'Unable to load backlog data.';
        return of({ 
          projects: [] as project[], 
          sprints: [] as Sprint[], 
          userStories: [] as UserStoryDto[], 
          tasks: [] as TaskDto[] 
        });
      }))
      .subscribe(({ projects, sprints, userStories, tasks }) => {
        this.projectBacklogs = this.buildProjectBacklogs(projects, sprints, userStories, tasks, this.selectedProjectId);
        if (this.selectedProjectId !== null && this.projectBacklogs.length === 0 && projects.length > 0) {
          this.filterProjectNotFound = true;
        }
        this.loading = false;
        this.cdr.detectChanges();
      });
  }

  private buildProjectBacklogs(
    projects: project[],
    sprints: Sprint[],
    userStories: UserStoryDto[],
    tasks: TaskDto[],
    selectedProjectId?: number | null
  ): ProjectBacklog[] {
    const filteredProjects = selectedProjectId
      ? projects.filter((projectItem) => Number(projectItem.id ?? -1) === Number(selectedProjectId))
      : projects;

    const sortedProjects = [...filteredProjects].sort((a, b) => a.name.localeCompare(b.name));

    return sortedProjects.map((projectItem) => {
      const projectSprints = sprints
        .filter((sprint) => sprint.projectId === projectItem.id)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      const sprintBacklogs: SprintBacklog[] = projectSprints.map((sprint) => {
        const sprintUserStories = userStories
          .filter((us) => Number(us.sprintId ?? -1) === sprint.id)
          .sort((a, b) => a.title.localeCompare(b.title));

        const userStoriesWithTasks: UserStoryWithTasks[] = sprintUserStories.map((us) => {
          const storyTasks = tasks
            .filter((task) => Number(task.userStoryId ?? -1) === Number(us.id))
            .sort((a, b) => a.title.localeCompare(b.title));

          return { userStory: us, tasks: storyTasks };
        });

        const totalStoryPoints = sprintUserStories.reduce((sum, us) => sum + (us.storyPoints || 0), 0);

        return {
          sprint,
          userStories: userStoriesWithTasks,
          totalStoryPoints,
          velocity: totalStoryPoints
        };
      });

      const totalUserStories = sprintBacklogs.reduce((sum, current) => sum + current.userStories.length, 0);

      return {
        project: projectItem,
        sprints: sprintBacklogs,
        totalUserStories
      };
    });
  }
  navigateToProjectDetails(): void {
    if (this.selectedProjectId !== null) {
      this.router.navigate(['/ProjectManage'], { 
        queryParams: { projectId: this.selectedProjectId, detailTab: 'overview' } 
      });
    } else {
      this.router.navigate(['/ProjectManage']);
    }
  }

  getProjectStateLabel(state: number): string {
    const labels: Record<number, string> = {
      0: 'Pending',
      1: 'To do',
      2: 'In progress',
      3: 'Done',
      4: 'Validated'
    };

    return labels[state] ?? 'Unknown';
  }

  getTaskStatusLabel(status: TaskDto['status']): string {
    if (typeof status === 'number') {
      return this.getProjectStateLabel(status);
    }

    const labels: Record<string, string> = {
      pending: 'Pending',
      todo: 'To do',
      inProgress: 'In progress',
      done: 'Done',
      validated: 'Validated'
    };

    return labels[status] ?? 'Unknown';
  }

  getUserStoryStatusLabel(status: any): string {
    if (typeof status === 'number') {
      return this.getProjectStateLabel(status);
    }

    const labels: Record<string, string> = {
      'to do': 'À faire',
      'in progress': 'En cours',
      'in review': 'En révision',
      'review': 'Révision',
      'testing': 'Tests',
      'done': 'Fait',
      'todo': 'À faire',
      'inprogress': 'En cours'
    };

    const normalized = String(status ?? '').trim().toLowerCase();
    return labels[normalized] ?? (String(status) || 'Unknown');
  }

  getUserStoryPriorityLabel(priority: number): string {
    const labels: Record<number, string> = {
      1: 'Basse',
      2: 'Moyenne',
      3: 'Haute',
      4: 'Critique'
    };

    return labels[priority] ?? 'Unknown';
  }


  getTaskCount(story: UserStoryWithTasks): number {
    return story.tasks.length || Number(story.userStory.taskCount ?? 0);
  }

  getStoryAssigneeInitials(story: UserStoryDto): string {
    const label = String(story.assignedToName ?? '').trim();
    if (!label) {
      return '—';
    }

    const initials = label
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('');

    return initials.toUpperCase() || '—';
  }

  getTaskStatusChipClass(status: TaskDto['status']): string {
    const value = String(status ?? '').trim().toLowerCase();
    const normalized = value === 'inprogress' ? 'in-progress' : value;
    return `status-chip status-${normalized || 'pending'}`;
  }

  getTaskAssigneeLabel(task: TaskDto): string {
    const assignedTo = String(task.assignedToName ?? '').trim();
    return assignedTo || 'Unassigned';
  }

  getTaskComplexityLabel(task: TaskDto): string {
    const complexity = Number(task.complexity ?? 0);
    if (!Number.isFinite(complexity) || complexity <= 0) {
      return 'Complexity: -';
    }

    return `Complexity: ${complexity}`;
  }

  formatDate(value: Date | string | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString();
  }

  clearProjectFilter(): void {
    this.router.navigate(['/Backlog']);
  }

}
