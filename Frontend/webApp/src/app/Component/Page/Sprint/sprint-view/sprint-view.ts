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
        this.error = 'Invalid sprint ID';
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

}
