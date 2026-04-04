import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Sprint, SprintService, State } from '../Service/SprintService';

@Component({
  selector: 'app-sprint-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sprint-view.html',
  styleUrl: './sprint-view.css',
})
export class SprintView implements OnInit {
  sprint: Sprint | null = null;
  loading = true;
  error = '';

  constructor(
    private sprintService: SprintService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const sprintId = Number(params['id']);
      if (!sprintId) {
          this.error = 'Sprint ID is invalid';
        this.loading = false;
        return;
      }
      this.loadSprint(sprintId);
    });
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
          this.error = 'Error loading the sprint';
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
    if (this.sprint.sprintState !== State.pending) {
        this.error = 'You can only delete this sprint when it is pending.';
      return;
    }
    this.sprintService.deleteSprint(this.sprint.id).subscribe({
      next: () => this.router.navigate(['/SprintManage']),
      error: () => this.error = 'Error deleting the sprint'
    });
  }

  canDeleteSprint(): boolean {
    return !!this.sprint && this.sprint.sprintState === State.pending;
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

}
