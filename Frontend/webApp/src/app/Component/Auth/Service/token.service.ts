import { Injectable, inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AppRole, AuthResponse, JwtPayload } from '../model/auth.model';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private platformId = inject(PLATFORM_ID);
  private readonly accessKey = 'access_token';
  private readonly refreshKey = 'refresh_token';
  private readonly userKey = 'user_data';

  private readonly roleAliases: Readonly<Record<string, AppRole>> = {
    '0': AppRole.Admin,
    '1': AppRole.ServiceManager,
    '2': AppRole.ProjectManager,
    '3': AppRole.Employee,
    '4': AppRole.Observer,
    '5': AppRole.Observer,
    admin: AppRole.Admin,
    administrator: AppRole.Admin,
    servicemanager: AppRole.ServiceManager,
    'service-manager': AppRole.ServiceManager,
    service_manager: AppRole.ServiceManager,
    projectmanager: AppRole.ProjectManager,
    'project-manager': AppRole.ProjectManager,
    project_manager: AppRole.ProjectManager,
    chefprojet: AppRole.ProjectManager,
    chefdeprojet: AppRole.ProjectManager,
    employee: AppRole.Employee,
    employe: AppRole.Employee,
    observer: AppRole.Observer,
    observateur: AppRole.Observer
  };

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  getAccessToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(this.accessKey);
  }

  getRefreshToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(this.refreshKey);
  }

  getUserRole(): AppRole | null {
    const storedRole = this.getUserData()?.role;
    if (storedRole !== undefined && storedRole !== null) {
      return this.normalizeRole(storedRole);
    }

    const tokenRole = this.getTokenPayload()?.role;
    if (tokenRole !== undefined && tokenRole !== null) {
      return this.normalizeRole(tokenRole);
    }

    return null;
  }

  getUserData(): AuthResponse | null {
    if (!this.isBrowser) {
      return null;
    }

    const rawUser = localStorage.getItem(this.userKey);
    if (!rawUser) {
      return null;
    }

    return this.safeParseUserData(rawUser);
  }

  setTokens(accessToken: string, refreshToken: string | null | undefined, userData: AuthResponse): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(this.accessKey, accessToken);

    if (refreshToken) {
      localStorage.setItem(this.refreshKey, refreshToken);
    } else {
      localStorage.removeItem(this.refreshKey);
    }

    localStorage.setItem(this.userKey, JSON.stringify(userData));
  }

  clear(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(this.accessKey);
    localStorage.removeItem(this.refreshKey);
    localStorage.removeItem(this.userKey);
  }

  getTokenPayload(token?: string | null): JwtPayload | null {
    const jwtToken = token ?? this.getAccessToken();
    if (!jwtToken) {
      return null;
    }

    return this.parseTokenPayload(jwtToken);
  }

  getTokenExpirationUnix(token?: string | null): number | null {
    const payload = this.getTokenPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      return null;
    }

    return payload.exp;
  }

  isTokenExpired(token?: string | null): boolean {
    const expiration = this.getTokenExpirationUnix(token);
    if (expiration === null) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return expiration <= now;
  }

  hasAnyRole(roles: readonly AppRole[]): boolean {
    const currentRole = this.getUserRole();
    if (!currentRole) {
      return false;
    }

    return roles.includes(currentRole);
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return token !== null && !this.isTokenExpired(token);
  }

  normalizeRole(role: string | number): AppRole | null {
    const normalizedKey = String(role).trim().toLowerCase();
    return this.roleAliases[normalizedKey] ?? null;
  }

  private parseTokenPayload(token: string): JwtPayload | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return null;
      }

      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(normalized)
          .split('')
          .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join('')
      );

      const parsed = JSON.parse(jsonPayload) as unknown;
      if (!this.isJwtPayload(parsed)) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private safeParseUserData(rawUser: string): AuthResponse | null {
    try {
      const parsed = JSON.parse(rawUser) as unknown;
      if (!this.isAuthResponse(parsed)) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private isJwtPayload(value: unknown): value is JwtPayload {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const maybePayload = value as Partial<JwtPayload>;
    return typeof maybePayload.exp === 'number';
  }

  private isAuthResponse(value: unknown): value is AuthResponse {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<AuthResponse>;
    return typeof candidate.firstName === 'string'
      && typeof candidate.lastName === 'string'
      && typeof candidate.email === 'string'
      && (typeof candidate.role === 'string' || typeof candidate.role === 'number');
  }
}
