import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AppRole } from '../model/auth.model';
import { RoleGuard } from './role.guard';
import { TokenService } from './token.service';

function isAppRole(value: unknown): value is AppRole {
  return Object.values(AppRole).includes(value as AppRole);
}

function extractRequiredRoles(route: ActivatedRouteSnapshot): readonly AppRole[] {
  const routeRoles = route.data['roles'];
  if (!Array.isArray(routeRoles)) {
    return [];
  }

  return routeRoles.filter(isAppRole);
}

export const authGuard: CanActivateFn = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (tokenService.isAuthenticated()) {
    return true;
  }

  if (tokenService.getAccessToken()) {
    tokenService.clear();
  }

  return router.createUrlTree(['/login'], {
    queryParams: state.url ? { returnUrl: state.url } : undefined
  });
};

export const guestGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  const roleNavigator = inject(RoleGuard);

  if (!tokenService.isAuthenticated()) {
    return true;
  }

  return router.parseUrl(roleNavigator.getDashboardByRole());
};

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  const roleNavigator = inject(RoleGuard);

  if (!tokenService.isAuthenticated()) {
    return router.parseUrl('/login');
  }

  const requiredRoles = extractRequiredRoles(route);
  if (requiredRoles.length === 0 || tokenService.hasAnyRole(requiredRoles)) {
    return true;
  }

  return router.parseUrl(roleNavigator.getDashboardByRole());
};
