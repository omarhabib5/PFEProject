import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environment';
import { UserStoryStatus } from '../../UserStory/Models/userstory.model';

export type TaskState = 'pending' | 'todo' | 'inProgress' | 'done' | 'validated' | number;

export interface TaskDto {
	id: number;
	title: string;
	description: string;
	status: TaskState;
	taskState?: TaskState;
	estimatedHours: number;
	actualHours?: number | null;
	complexity?: number;
	startDate?: string;
	endDate?: string;
	userStoryId: number;
	sprintId?: number | null;
	assignedToId?: number | null;
	assignedToName?: string | null;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface CreateTaskRequest {
	title: string;
	description: string;
	estimatedHours: number;
	status: TaskState;
	complexity: number;
	startDate: string;
	endDate: string;
	userStoryId: number;
	assignedToId?: number | null;
	sprintId?: number | null;
}

export interface UpdateTaskRequest extends CreateTaskRequest {
	id: number;
}

@Injectable({
	providedIn: 'root'
})
export class TaskService {
	private apiUrl = `${environment.apiUrl}/Task`;

	constructor(private http: HttpClient) {}

	private getAuthHeaders(): HttpHeaders {
		const token = localStorage.getItem('token');
		return new HttpHeaders({
			'content-type': 'application/json',
			'Authorization': `Bearer ${token}`
		});
	}
updateStatus(id: number | string, status: UserStoryStatus): Observable<void> {
		const normalizedTaskState = this.toApiTaskStateNumber(status);
		return this.http.put<void>(
			`${this.apiUrl}/${id}`,
			{ taskState: normalizedTaskState },
			{ headers: this.getAuthHeaders() }
		);
	}

getAll(): Observable<TaskDto[]> {
		return this.http.get<any[]>(this.apiUrl, {
			headers: this.getAuthHeaders()
		}).pipe(map((items) => (Array.isArray(items) ? items : []).map((item) => this.mapTaskFromApi(item))));
	}
	getById(id: number): Observable<TaskDto> {
		return this.http.get<any>(`${this.apiUrl}/${id}`, {
			headers: this.getAuthHeaders()
		}).pipe(map((item) => this.mapTaskFromApi(item)));
	}

	create(request: CreateTaskRequest): Observable<{ id: number }> {
		const normalizedTaskState = this.toApiTaskStateNumber((request as any).taskState ?? request.status);
		const payload = {
			Name: request.title,
			description: request.description,
			EstimationDuration: Number(request.estimatedHours ?? 0),
			StartDate: request.startDate,
			EndDate: request.endDate,
			taskState: normalizedTaskState,
			complexity: Number(request.complexity ?? 1),
			UserStoryId: Number(request.userStoryId ?? 0)
		};

		return this.http.post<{ id: number }>(this.apiUrl, payload, {
			headers: this.getAuthHeaders()
		});}

		update(request: UpdateTaskRequest): Observable<void> {
		const normalizedTaskState = this.toApiTaskStateNumber((request as any).taskState ?? request.status);
		const payload = {
			id: request.id,
			Name: request.title,
			description: request.description,
			EstimationDuration: Number(request.estimatedHours ?? 0),
			StartDate: request.startDate,
			EndDate: request.endDate,
			taskState: normalizedTaskState,
			complexity: Number(request.complexity ?? 1),
			UserStoryId: Number(request.userStoryId ?? 0)
		};

		return this.http.put<void>(`${this.apiUrl}/${request.id}`, payload, {
			headers: this.getAuthHeaders()
		});
	}

	delete(id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${id}`, {
			headers: this.getAuthHeaders()
		});
	}
	private mapTaskFromApi(item: any): TaskDto {
		const normalizedStatus = this.normalizeTaskState(item?.taskState ?? item?.status);
		return {
			id: Number(item?.id ?? 0),
			title: item?.title ?? item?.name ?? '',
			description: item?.description ?? '',
			status: normalizedStatus,
			estimatedHours: Number(item?.estimatedHours ?? item?.estimationDuration ?? 0),
			actualHours: item?.actualHours ?? null,
			complexity: item?.complexity ?? 1,
			startDate: item?.startDate,
			endDate: item?.endDate,
			userStoryId: Number(item?.userStoryId ?? 0),
			sprintId: item?.sprintId ?? null,
			assignedToId: item?.assignedToId ?? null,
			assignedToName: item?.assignedToName ?? null,
			createdAt: item?.createdAt,
			updatedAt: item?.updatedAt ?? null
		};
	}

	private normalizeTaskState(value: any): TaskState {
		const mapByNumber: Record<number, TaskState> = {
			0: 'pending',
			1: 'todo',
			2: 'inProgress',
			3: 'done',
			4: 'validated'
		};

		if (typeof value === 'number') {
			return mapByNumber[value] ?? 'pending';
		}

		if (typeof value !== 'string') {
			return 'pending';
		}

		const normalized = value.trim();
		if (normalized === 'inprogress') {
			return 'inProgress';
		}

		const validStates: TaskState[] = ['pending', 'todo', 'inProgress', 'done', 'validated'];
		return validStates.includes(normalized as TaskState) ? (normalized as TaskState) : 'pending';
	}

	private toApiTaskStateNumber(value: any): number {
		if (typeof value === 'number' && value >= 0 && value <= 4) {
			return value;
		}

		const normalized = this.normalizeTaskState(value);
		const mapByLabel: Record<string, number> = {
			pending: 0,
			todo: 1,
			inProgress: 2,
			done: 3,
			validated: 4
		};

		return mapByLabel[String(normalized)] ?? 0;
	}
}
