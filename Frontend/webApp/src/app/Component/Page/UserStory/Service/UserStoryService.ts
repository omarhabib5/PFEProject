
import {
  UserStoryDto,
  UserStoryDetailDto,
  CreateUserStoryRequest,
  UpdateUserStoryRequest,
  UpdateUserStoryStatusRequest,
  UserStoryStatus
} from '../Models/userstory.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class UserStoryService {
  private apiUrl = `${environment.apiUrl}/UserStory`;
  private fallbackApiUrl = `${environment.apiUrl}/userstories`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers: Record<string, string> = {
      'content-type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  getAllUserStories(): Observable<UserStoryDto[]> {
    return this.withFallback(
      this.http.get<UserStoryDto[]>(this.apiUrl, { headers: this.getAuthHeaders() }),
      () => this.http.get<UserStoryDto[]>(this.fallbackApiUrl, { headers: this.getAuthHeaders() })
    );
  }

  getBySprintId(sprintId: number): Observable<UserStoryDto[]> {
    return this.withFallback(
      this.http.get<UserStoryDto[]>(
        `${this.apiUrl}/sprint/${sprintId}`,
        { headers: this.getAuthHeaders() }
      ),
      () => this.http.get<UserStoryDto[]>(
        `${this.fallbackApiUrl}/sprint/${sprintId}`,
        { headers: this.getAuthHeaders() }
      )
    );
  }

  getByProjectId(projectId: number): Observable<UserStoryDto[]> {
    return this.withFallback(
      this.http.get<UserStoryDto[]>(
        `${this.apiUrl}/project/${projectId}`,
        { headers: this.getAuthHeaders() }
      ),
      () => this.http.get<UserStoryDto[]>(
        `${this.fallbackApiUrl}/project/${projectId}`,
        { headers: this.getAuthHeaders() }
      )
    );
  }

  getById(id: number): Observable<UserStoryDetailDto> {
    return this.withFallback(
      this.http.get<UserStoryDetailDto>(
        `${this.apiUrl}/${id}`,
        { headers: this.getAuthHeaders() }
      ),
      () => this.http.get<UserStoryDetailDto>(
        `${this.fallbackApiUrl}/${id}`,
        { headers: this.getAuthHeaders() }
      )
    );
  }

  create(request: CreateUserStoryRequest): Observable<number> {
    return this.withFallback(
      this.http.post<number>(
        this.apiUrl,
        request,
        { headers: this.getAuthHeaders() }
      ),
      () => this.http.post<number>(
        this.fallbackApiUrl,
        request,
        { headers: this.getAuthHeaders() }
      )
    );
  }

  update(id: number, request: UpdateUserStoryRequest): Observable<void> {
    return this.withFallback(
      this.http.put<void>(
        `${this.apiUrl}/${id}`,
        request,
        { headers: this.getAuthHeaders() }
      ),
      () => this.http.put<void>(
        `${this.fallbackApiUrl}/${id}`,
        request,
        { headers: this.getAuthHeaders() }
      )
    );
  }

  updateStatus(id: number, status: UserStoryStatus): Observable<void> {
    const request: UpdateUserStoryStatusRequest = { status };
    return this.withFallback(
      this.http.patch<void>(
        `${this.apiUrl}/${id}/status`,
        request,
        { headers: this.getAuthHeaders() }
      ),
      () => this.http.patch<void>(
        `${this.fallbackApiUrl}/${id}/status`,
        request,
        { headers: this.getAuthHeaders() }
      )
    );
  }

  delete(id: number): Observable<void> {
    return this.withFallback(
      this.http.delete<void>(
        `${this.apiUrl}/${id}`,
        { headers: this.getAuthHeaders() }
      ),
      () => this.http.delete<void>(
        `${this.fallbackApiUrl}/${id}`,
        { headers: this.getAuthHeaders() }
      )
    );
  }

  private withFallback<T>(primaryRequest: Observable<T>, fallbackRequestFactory: () => Observable<T>): Observable<T> {
    return primaryRequest.pipe(
      catchError((error) => {
        if (error?.status === 404) {
          return fallbackRequestFactory();
        }

        return throwError(() => error);
      })
    );
  }

}