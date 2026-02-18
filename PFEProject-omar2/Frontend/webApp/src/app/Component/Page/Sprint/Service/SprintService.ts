import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export enum State {
    pending = 0,
    todo = 1,
    inProgress = 2,
    done = 3,
    validated = 4
}

export interface Sprint {
    id: number;
    name: string;
    description: string;
    estimatedDuration: number;
    startDate: Date;
    endDate: Date;
    sprintState: State;
    projectId: number;
}

export interface CreateSprintDto {
    name: string;
    description: string;
    estimatedDuration: number;
    startDate: Date;
    endDate: Date;
    sprintState: State;
    projectId: number;
}

export interface UpdateSprintDto {
    id: number;
    name: string;
    description: string;
    estimatedDuration: number;
    startDate: Date;
    endDate: Date;
    sprintState: State;
    projectId: number;
}

@Injectable({
    providedIn: "root",
})
export class SprintService {
    private http = inject(HttpClient);
    private apiUrl = 'https://localhost:7219/api/Sprint';

    getAllSprints(): Observable<Sprint[]> {
        return this.http.get<Sprint[]>(this.apiUrl);
    }

    getSprintById(id: number): Observable<Sprint> {
        return this.http.get<Sprint>(`${this.apiUrl}/${id}`);
    }

    getSprintsByProjectId(projectId: number): Observable<Sprint[]> {
        return this.http.get<Sprint[]>(`${this.apiUrl}/project/${projectId}`);
    }

    createSprint(sprint: CreateSprintDto): Observable<any> {
        return this.http.post(this.apiUrl, sprint);
    }

    updateSprint(id: number, sprint: UpdateSprintDto): Observable<void> {
        sprint.id = id;
        return this.http.put<void>(`${this.apiUrl}/${id}`, sprint);
    }

    deleteSprint(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}

