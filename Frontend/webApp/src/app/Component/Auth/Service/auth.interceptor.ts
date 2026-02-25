import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from './token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  const token = tokenService.getAccessToken();
  const isAuthEndpoint = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register');

  if (!isAuthEndpoint && token && tokenService.isTokenExpired(token)) {
    tokenService.clear();
    router.navigate(['/login']);
    return throwError(() => new Error('Token expiré. Veuillez vous reconnecter.'));
  }

  const authReq = token && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        tokenService.clear();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
