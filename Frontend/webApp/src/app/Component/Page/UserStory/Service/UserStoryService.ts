
import {  UserStoryDto,
  UserStoryDetailDto,
  CreateUserStoryRequest,
  UpdateUserStoryRequest,
  UpdateUserStoryStatusRequest,
  UserStoryStatus } from '../Models/userstory.model';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class UserStoryService {
  private apiUrl = `${environment.apiUrl}/UserStory`;
    constructor(private http: HttpClient) { }

      getBySprintId(sprintId: number): Observable<UserStoryDto[]> {
    return this.http.get<UserStoryDto[]>(
      `${this.apiUrl}/sprint/${sprintId}`
    );
  }

    getById(id: number): Observable<UserStoryDetailDto> {
    return this.http.get<UserStoryDetailDto>(
      `${this.apiUrl}/${id}`
    );
  }

    create(request: CreateUserStoryRequest): Observable<number> {
    return this.http.post<number>(
      this.apiUrl,
      request
    );
  }

    update(id: number, request: UpdateUserStoryRequest): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/${id}`,
      request
    );
  }

    updateStatus(id: number, status: UserStoryStatus): Observable<void> {
    const request: UpdateUserStoryStatusRequest = { status };
    return this.http.patch<void>(
      `${this.apiUrl}/${id}/status`,
      request
    );
  }

    delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }

}