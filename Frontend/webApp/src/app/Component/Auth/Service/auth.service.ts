import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment';
import {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileImageRequest,
  UserProfile
} from '../model/auth.model';
import { Observable, catchError, finalize, of, tap } from 'rxjs';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient, private tokens: TokenService) {}

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap((res) => this.tokens.setTokens(res.token, res.refreshToken, res))
    );
  }


  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/profile`);
  }

  changePassword(payload: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/change-password`, payload);
  }

  updateProfileImage(payload: UpdateProfileImageRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.baseUrl}/profile-image`, payload);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {}).pipe(
      catchError(() => of(void 0)),
      finalize(() => this.tokens.clear())
    );
  }
}
