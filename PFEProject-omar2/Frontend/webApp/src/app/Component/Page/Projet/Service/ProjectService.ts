import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { inject } from "@angular/core";
import { Observable } from "rxjs";
import { Service, User } from "../../service-page/Service/Service";


export enum State{
        pending=0,
        todo=1,
        inProgress=2,
        done=3,
        validated=4
}

export interface Team {
  id: number;
  name: string;
}
export interface Sprint{
    id:number,
    name:string
}
export interface UserStory{
    id:number,
    name:string
}

export interface project {
    id?: number;
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    estimatedDuration: number;
    projectState: State;
    serviceId?: number;
    projectManagerId: number;
    teamId?: number;
    projectManager?: User;
    team?: Team;
    sprints?: Sprint[];
    userStories?: UserStory[];
}

export interface CreateProjectDto {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    estimatedDuration: number;
    projectState: State;
    serviceId?: number;
    teamId?: number;
    projectManagerId: number;
}

export interface UpdateProjectDto {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    estimatedDuration: number;
    projectState: State;
    serviceId?: number;
    teamId?: number;
    projectManagerId: number;
}

@Injectable({
    providedIn: "root",
})
export class ProjectService {
    private apiUrl = 'https://localhost:7219/api/Project';
    private http = inject(HttpClient);

  
    getAllProjects(): Observable<project[]> {
        return this.http.get<project[]>(this.apiUrl);
    }

    
    getProjectById(id: number): Observable<project> {
        return this.http.get<project>(`${this.apiUrl}/${id}`);
    }

  
    createProject(projectData: CreateProjectDto): Observable<any> {
        return this.http.post<any>(this.apiUrl, projectData);
    }

  
    updateProject(id: number, projectData: UpdateProjectDto): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}`, projectData);
    }

   
     
    deleteProject(id: number): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }
}