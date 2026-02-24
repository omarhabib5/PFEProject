import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export enum State {
	pending = 0,
	todo = 1,
	inProgress = 2,
	done = 3,
	validated = 4,
}

export interface Task {
	id: number;
	name: string;
	description: string;
	estimationDuration: number;
	startDate: Date;
	endDate: Date;
	taskState: State;
	complexity: number;
	userStoryId: number;
	sprintId?: number | null;
	assignedToId?: number | null;
}

export interface CreateTaskDto {
	name: string;
	description: string;
	estimationDuration: number;
	startDate: Date;
	endDate: Date;
	taskState: State;
	complexity: number;
	userStoryId: number;
}

export interface UpdateTaskDto {
	id: number;
	name: string;
	description: string;
	estimationDuration: number;
	startDate: Date;
	endDate: Date;
	taskState: State;
	complexity: number;
	userStoryId: number;
}

@Injectable({
	providedIn: "root",
})
export class TaskService {
	private http = inject(HttpClient);
	private apiUrl = "https://localhost:7219/api/Task";

	getAllTasks(): Observable<Task[]> {
		return this.http.get<Task[]>(this.apiUrl);
	}

	getTaskById(id: number): Observable<Task> {
		return this.http.get<Task>(`${this.apiUrl}/${id}`);
	}

	createTask(task: CreateTaskDto): Observable<{ id: number }> {
		return this.http.post<{ id: number }>(this.apiUrl, task);
	}

	updateTask(id: number, task: UpdateTaskDto): Observable<void> {
		task.id = id;
		return this.http.put<void>(`${this.apiUrl}/${id}`, task);
	}

	deleteTask(id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${id}`);
	}
}
