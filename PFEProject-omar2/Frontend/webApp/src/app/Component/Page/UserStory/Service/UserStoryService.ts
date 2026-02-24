
import {  UserStoryDto,
  UserStoryDetailDto,
  CreateUserStoryRequest,
  UpdateUserStoryRequest,
  UpdateUserStoryStatusRequest,
  UserStoryStatus } from '../Model/userstory.model';
import { HttpClient, HttpHeaders  } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environement';

@Injectable({
  providedIn: 'root'
})
export class UserStoryService {
  private apiUrl = `${environment.apiUrl}/userstories`;
    constructor(private http: HttpClient) { }
    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        return new HttpHeaders({
            'content-type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
    }

      getBySprintId(sprintId: string): Observable<UserStoryDto[]> {
    return this.http.get<UserStoryDto[]>(
      `${this.apiUrl}/sprint/${sprintId}`,
      { headers: this.getAuthHeaders() }
    );
  }

    getById(id: string): Observable<UserStoryDetailDto> {
    return this.http.get<UserStoryDetailDto>(
      `${this.apiUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

    create(request: CreateUserStoryRequest): Observable<string> {
    return this.http.post<string>(
      this.apiUrl,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

    update(id: string, request: UpdateUserStoryRequest): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/${id}`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

    updateStatus(id: string, status: UserStoryStatus): Observable<void> {
    const request: UpdateUserStoryStatusRequest = { status };
    return this.http.patch<void>(
      `${this.apiUrl}/${id}/status`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

    delete(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

}