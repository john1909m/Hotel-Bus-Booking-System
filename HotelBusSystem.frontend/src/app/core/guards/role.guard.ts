import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { role } from '../models/User/user.model';

export const roleGuard = (allowedRoles: role[]): CanActivateFn => {
  return async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.ensureInitialized();

    const user = authService.currentUser();
    if (!user) {
      return router.createUrlTree(['/login']);
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    // Role unauthorized: redirect based on actual user role or home
    if (user.role === 'ADMIN') {
      return router.createUrlTree(['/admin']);
    } else {
      return router.createUrlTree(['/']);
    }
  };
};
