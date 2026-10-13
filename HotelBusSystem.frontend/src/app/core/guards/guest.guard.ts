import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ensureInitialized();

  if (!authService.isAuthenticated()) {
    return true;
  }

  // If already logged in, redirect away from login/register
  const role = authService.userRole();
  if (role === 'ADMIN') {
    return router.createUrlTree(['/admin']);
  }
  return router.createUrlTree(['/']);
};
