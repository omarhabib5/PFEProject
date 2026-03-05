import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from './token.service';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register'];

function isPublicAuthEndpoint(url: string): boolean {
  const normalizedUrl = url.toLowerCase();
  return PUBLIC_AUTH_PATHS.some((path) => normalizedUrl.includes(path));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (req.context.get(SKIP_AUTH) || isPublicAuthEndpoint(req.url)) {
    return next(req);
  }

  const token = tokenService.getAccessToken();

  if (token && tokenService.isTokenExpired(token)) {
    tokenService.clear();
    void router.navigate(['/login']);
    return throwError(() => new Error('Your session has expired. Please sign in again.'));
  }

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        tokenService.clear();
        void router.navigate(['/login']);
      }

      if (error.status === 403) {
        void router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
