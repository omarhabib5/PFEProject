import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard {
  private tokenService = inject(TokenService);
  private router = inject(Router);

  getDashboardByRole(): string {
    const role = this.tokenService.getUserRole();
    
    switch (role?.toLowerCase()) {
      case 'admin':
      case '1':
        return '/AdminDashboard';
      case 'projectmanager':
      case '2':
        return '/ChefProjetDashboard';
      case 'employee':
      case '3':
        return '/EmployeeDashboard';
      case 'servicemanager':
      case '4':
        return '/ResponsableServiceDashboard';
      default:
        return '/AdminDashboard';
    }
  }

  redirectToDashboard(): void {
    const dashboard = this.getDashboardByRole();
    this.router.navigate([dashboard]);
  }

  canActivate(): boolean {
    if (!this.tokenService.isAuthenticated()) {
      this.router.navigate(['/']);
      return false;
    }
    return true;
  }
}