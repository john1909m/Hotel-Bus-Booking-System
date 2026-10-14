import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Await initialization so /auth/me call finishes on page refresh
  await authService.ensureInitialized();

  if (authService.isAuthenticated()) {
    return true;
  }

  // Not authenticated: redirect to login and preserve destination URL
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
