
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

  private toOptionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private normalizeCreatePayload(request: CreateUserStoryRequest): {
    title: string;
    description: string;
    acceptanceCriteria: string;
    storyPoints: number;
    priority: number;
    sprintId: number;
    assignedToId?: number;
  } {
    const title = (request.title ?? request.name ?? '').trim();
    const description = (request.description ?? title).trim();

    const storyPointsSource = this.toOptionalNumber(request.storyPoints)
      ?? this.toOptionalNumber(request.estimatedDuration)
      ?? 1;
    const prioritySource = this.toOptionalNumber(request.priority) ?? 1;

    const sprintId = this.toOptionalNumber(request.sprintId) ?? 0;
    const assignedToId = this.toOptionalNumber(request.assignedToId);

    return {
      title,
      description,
      acceptanceCriteria: (request.acceptanceCriteria ?? '').trim(),
      storyPoints: this.clamp(Math.round(storyPointsSource), 1, 100),
      priority: this.clamp(Math.round(prioritySource), 1, 5),
      sprintId,
      ...(assignedToId !== undefined ? { assignedToId } : {})
    };
  }

  private normalizeUpdatePayload(request: UpdateUserStoryRequest): {
    title?: string;
    description?: string;
    acceptanceCriteria?: string;
    storyPoints?: number;
    priority?: number;
    assignedToId?: number;
  } {
    const title = (request.title ?? request.name ?? '').trim();
    const description = (request.description ?? '').trim();
    const acceptanceCriteria = (request.acceptanceCriteria ?? '').trim();

    const storyPoints = this.toOptionalNumber(request.storyPoints);
    const priority = this.toOptionalNumber(request.priority);
    const assignedToId = this.toOptionalNumber(request.assignedToId);

    return {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(acceptanceCriteria ? { acceptanceCriteria } : {}),
      ...(storyPoints !== undefined ? { storyPoints: this.clamp(Math.round(storyPoints), 1, 100) } : {}),
      ...(priority !== undefined ? { priority: this.clamp(Math.round(priority), 1, 5) } : {}),
      ...(assignedToId !== undefined ? { assignedToId } : {})
    };
  }

  create(request: CreateUserStoryRequest): Observable<number> {
    const payload = this.normalizeCreatePayload(request);

    return this.withFallback(
      this.http.post<number>(
        this.apiUrl,
        payload,
        { headers: this.getAuthHeaders() }
      ),
      () => this.http.post<number>(
        this.fallbackApiUrl,
        payload,
        { headers: this.getAuthHeaders() }
      )
    );
  }

  update(id: number, request: UpdateUserStoryRequest): Observable<void> {
    const payload = this.normalizeUpdatePayload(request);

    return this.withFallback(
      this.http.put<void>(
        `${this.apiUrl}/${id}`,
        payload,
        { headers: this.getAuthHeaders() }
      ),
      () => this.http.put<void>(
        `${this.fallbackApiUrl}/${id}`,
        payload,
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