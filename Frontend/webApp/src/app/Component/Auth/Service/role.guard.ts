import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TokenService } from './token.service';
import { AppRole } from '../model/auth.model';

@Injectable({ providedIn: 'root' })
export class RoleGuard {
  private tokenService = inject(TokenService);
  private router = inject(Router);

  private readonly dashboardByRole: Readonly<Record<AppRole, string>> = {
    [AppRole.Admin]: '/AdminDashboard',
    [AppRole.ProjectManager]: '/ChefProjetDashboard',
    [AppRole.Employee]: '/EmployeeDashboard',
    [AppRole.ServiceManager]: '/ResponsableServiceDashboard',
    [AppRole.Observer]: '/ObserverDashboard'
  };

  getDashboardByRole(role?: string | number | null): string {
    const normalizedRole = role !== undefined && role !== null
      ? this.tokenService.normalizeRole(role)
      : this.tokenService.getUserRole();

    if (!normalizedRole) {
      return '/login';
    }

    return this.dashboardByRole[normalizedRole];
  }

  redirectToDashboard(role?: string | number | null): void {
    const dashboard = this.getDashboardByRole(role);
    void this.router.navigateByUrl(dashboard);
  }

  canActivate(): boolean {
    if (!this.tokenService.isAuthenticated()) {
      void this.router.navigate(['/login']);
      return false;
    }

    return true;
  }

  hasAnyRole(roles: readonly AppRole[]): boolean {
    return this.tokenService.hasAnyRole(roles);
  }
}