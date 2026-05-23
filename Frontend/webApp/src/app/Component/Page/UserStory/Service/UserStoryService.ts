
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

  private normalizeStateValue(value: unknown): number | undefined {
    const numericValue = this.toOptionalNumber(value);
    if (numericValue !== undefined) {
      return numericValue;
    }

    const normalized = String(value ?? '').trim().toLowerCase();

    switch (normalized) {
      case 'pending':
        return 0;
      case 'todo':
      case 'to do':
        return 1;
      case 'inprogress':
      case 'in progress':
      case 'review':
      case 'testing':
        return 2;
      case 'done':
        return 3;
      case 'validated':
        return 4;
      default:
        return undefined;
    }
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
    status?: number;
    estimatedDuration?: number;
  } {
    const title = (request.title ?? request.name ?? '').trim();
    const normalizedDescription = (request.description ?? '').trim();
    const description = normalizedDescription || title;

    const storyPointsSource = this.toOptionalNumber(request.storyPoints)
      ?? this.toOptionalNumber(request.estimatedDuration)
      ?? 1;
    const prioritySource = this.toOptionalNumber(request.priority) ?? 1;
    const estimatedDuration = this.toOptionalNumber(request.estimatedDuration);
    const status = this.normalizeStateValue(request.status ?? request.userStoryState);

    const sprintId = this.toOptionalNumber(request.sprintId) ?? 0;
    const assignedToId = this.toOptionalNumber(request.assignedToId);

    return {
      title,
      description,
      acceptanceCriteria: (request.acceptanceCriteria ?? '').trim(),
      storyPoints: this.clamp(Math.round(storyPointsSource), 1, 100),
      priority: this.clamp(Math.round(prioritySource), 1, 5),
      sprintId,
      ...(status !== undefined ? { status } : {}),
      ...(estimatedDuration !== undefined ? { estimatedDuration: this.clamp(Math.round(estimatedDuration), 1, 100) } : {}),
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
    sprintId?: number;
    status?: number;
    estimatedDuration?: number;
  } {
    const title = (request.title ?? request.name ?? '').trim();
    const description = (request.description ?? '').trim();
    const acceptanceCriteria = (request.acceptanceCriteria ?? '').trim();

    const storyPoints = this.toOptionalNumber(request.storyPoints);
  
    const assignedToId = this.toOptionalNumber(request.assignedToId);
    const sprintId = this.toOptionalNumber(request.sprintId);
    const status = this.normalizeStateValue(request.status ?? request.userStoryState);
    const estimatedDuration = this.toOptionalNumber(request.estimatedDuration);

    return {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(acceptanceCriteria ? { acceptanceCriteria } : {}),
      ...(storyPoints !== undefined ? { storyPoints: this.clamp(Math.round(storyPoints), 1, 100) } : {}),

      ...(assignedToId !== undefined ? { assignedToId } : {}),
      ...(sprintId !== undefined ? { sprintId } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(estimatedDuration !== undefined ? { estimatedDuration: this.clamp(Math.round(estimatedDuration), 1, 100) } : {})
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

  updateStatus(id: number, status: UserStoryStatus | number): Observable<void> {
    const request: UpdateUserStoryStatusRequest = { status: this.normalizeStateValue(status) ?? 1 };
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

  delete(id: number | string): Observable<void> {
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