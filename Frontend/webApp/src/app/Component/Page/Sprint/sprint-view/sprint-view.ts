import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Sprint, SprintService, State } from '../Service/SprintService';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-sprint-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sprint-view.html',
  styleUrl: './sprint-view.css',
})
export class SprintView implements OnInit, OnDestroy {
  sprint: Sprint | null = null;
  loading = true;
  error = '';
  private autoRefreshSubscription: Subscription | null = null;
  private readonly autoRefreshMs = 15000;
  private currentSprintId: number | null = null;

  constructor(
    private sprintService: SprintService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const sprintId = Number(params['id']);
      if (!sprintId) {
        this.error = 'Invalid sprint ID';
        this.loading = false;
        return;
      }
      this.currentSprintId = sprintId;
      this.loadSprint(sprintId);
      this.startAutoRefresh();
    });
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadSprint(id: number): void {
    this.loading = true;
    this.error = '';

    this.sprintService.getSprintById(id).subscribe({
      next: (data) => {
        this.sprint = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Error while loading sprint';
        this.loading = false;
      }
    });
  }

  goToEdit(): void {
    if (!this.sprint) return;
    this.router.navigate(['/SprintManage'], {
      queryParams: { editId: this.sprint.id }
    });
  }

  deleteSprint(): void {
    if (!this.sprint) return;
    this.sprintService.deleteSprint(this.sprint.id).subscribe({
      next: () => this.router.navigate(['/SprintManage']),
      error: () => this.error = 'Error while deleting sprint'
    });
  }

  goBack(): void {
    this.router.navigate(['/SprintManage']);
  }

  getStateLabel(state: State): string {
    const labels: Record<number, string> = {
      [State.pending]: 'Pending',
      [State.todo]: 'To Do',
      [State.inProgress]: 'In Progress',
      [State.done]: 'Done',
      [State.validated]: 'Validated'
    };
    return labels[Number(state)] ?? String(state);
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshSubscription = interval(this.autoRefreshMs).subscribe(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      if (this.currentSprintId) {
        this.loadSprint(this.currentSprintId);
      }
    });
  }

  private stopAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
    this.autoRefreshSubscription = null;
  }

}
