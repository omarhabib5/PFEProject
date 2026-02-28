import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import { UserStoryStatus } from '../../UserStory/Models/userstory.model';

export type TaskState = 'pending' | 'todo' | 'inProgress' | 'done' | 'validated' | number;

export interface TaskDto {
	id: number;
	title: string;
	description: string;
	status: TaskState;
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
		return this.http.put<void>(
			`${this.apiUrl}/${id}`,
			{ status },
			{ headers: this.getAuthHeaders() }
		);
	}

	getAll(): Observable<TaskDto[]> {
		return this.http.get<TaskDto[]>(this.apiUrl, {
			headers: this.getAuthHeaders()
		});
	}

	getById(id: number): Observable<TaskDto> {
		return this.http.get<TaskDto>(`${this.apiUrl}/${id}`, {
			headers: this.getAuthHeaders()
		});
	}

	create(request: CreateTaskRequest): Observable<{ id: number }> {
		return this.http.post<{ id: number }>(this.apiUrl, request, {
			headers: this.getAuthHeaders()
		});
	}

	update(request: UpdateTaskRequest): Observable<void> {
		return this.http.put<void>(`${this.apiUrl}/${request.id}`, request, {
			headers: this.getAuthHeaders()
		});
	}

	delete(id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${id}`, {
			headers: this.getAuthHeaders()
		});
	}
}
