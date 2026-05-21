import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environment';
import {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UpdateProfileImageRequest,
  UserProfile
} from '../model/auth.model';
import { Observable, catchError, finalize, of, tap, throwError } from 'rxjs';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient, private tokens: TokenService) { }

  isAuthenticated(): boolean {
    return this.tokens.isAuthenticated();
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap((res) => {
        const accessToken = res.accessToken ?? res.token;
        if (!accessToken) {
          throw new Error('Access token missing in login response');
        }
        this.tokens.setTokens(accessToken, res.refreshToken, res);
      })
    );
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/profile`).pipe(
      catchError((error: unknown) => throwError(() => this.toDomainError(error, 'Unable to load your profile.')))
    );
  }

  changePassword(payload: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/change-password`, payload).pipe(
      catchError((error: unknown) => throwError(() => this.toDomainError(error, 'Unable to change password.')))
    );
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/forgot-password`, request).pipe(
      catchError((error) => {
        return throwError(() => this.toDomainError(error, 'Unable to process forgot password request.'));
      })
    );
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reset-password`, request).pipe(
      catchError((error) => {
        return throwError(() => this.toDomainError(error, 'Unable to reset password.'));
      })
    );
  }

  updateProfileImage(payload: UpdateProfileImageRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.baseUrl}/profile-image`, payload).pipe(
      catchError((error: unknown) => throwError(() => this.toDomainError(error, 'Unable to update profile image.')))
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {}).pipe(
      catchError((err) => {
        // Log the error to help debugging (client-side visibility)
        // The method still resolves so UI flow continues, but the console will show the server error details.
        console.error('Logout API error:', err);
        return of(void 0);
      }),
      finalize(() => this.tokens.clear())
    );
  }

  private toDomainError(error: unknown, fallbackMessage: string): Error {
    if (!(error instanceof HttpErrorResponse)) {
      return new Error(fallbackMessage);
    }

    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return new Error(error.error);
    }

    if (error.error && typeof error.error === 'object') {
      const maybeMessage = (error.error as { message?: unknown }).message;
      if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
        return new Error(maybeMessage);
      }
    }

    if (error.message.trim().length > 0) {
      return new Error(error.message);
    }

    return new Error(fallbackMessage);
  }
}
