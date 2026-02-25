import { Injectable, inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthResponse } from '../model/auth.model';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private platformId = inject(PLATFORM_ID);
  private accessKey = 'access_token';
  private refreshKey = 'refresh_token';
  private userKey = 'user_data';

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

  getUserRole(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    const user = localStorage.getItem(this.userKey);
    if (user) {
      try {
        const userData: AuthResponse = JSON.parse(user);
        return userData.role;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  getUserData(): AuthResponse | null {
    if (!this.isBrowser) {
      return null;
    }
    const user = localStorage.getItem(this.userKey);
    if (user) {
      try {
        return JSON.parse(user) as AuthResponse;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  setTokens(accessToken: string, refreshToken: string, userData: AuthResponse): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem(this.accessKey, accessToken);
    localStorage.setItem(this.refreshKey, refreshToken);
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

  isTokenExpired(token?: string | null): boolean {
    const jwtToken = token ?? this.getAccessToken();
    if (!jwtToken) {
      return true;
    }

    const payload = this.parseTokenPayload(jwtToken);
    if (!payload || typeof payload['exp'] !== 'number') {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload['exp'] <= now;
  }

  private parseTokenPayload(token: string): Record<string, any> | null {
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

      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }
  
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return token !== null && !this.isTokenExpired(token);
  }
}
