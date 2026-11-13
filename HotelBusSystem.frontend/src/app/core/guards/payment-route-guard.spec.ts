import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';

describe('Payment Route Protection - authGuard and roleGuard', () => {
  let mockRouter: any;
  let mockAuthService: any;
  let injector: Injector;

  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn((commands, extras) => ({
        commands,
        extras,
      })),
    };

    mockAuthService = {
      ensureInitialized: vi.fn().mockResolvedValue(null),
      isAuthenticated: vi.fn(),
      currentUser: vi.fn(),
    };

    injector = Injector.create({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
  });

  describe('authGuard on /payment', () => {
    it('redirects unauthenticated guest to /login with returnUrl=/payment', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/payment' } as RouterStateSnapshot;

      const result = await runInInjectionContext(injector, () => authGuard(route, state));

      expect(mockAuthService.ensureInitialized).toHaveBeenCalled();
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/payment' },
      });
      expect(result).toEqual({
        commands: ['/login'],
        extras: { queryParams: { returnUrl: '/payment' } },
      });
    });

    it('allows authenticated user through', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/payment' } as RouterStateSnapshot;

      const result = await runInInjectionContext(injector, () => authGuard(route, state));

      expect(result).toBe(true);
    });
  });

  describe('roleGuard([USER]) on /payment', () => {
    const userRoleGuard = roleGuard(['USER']);

    it('redirects to /login if user is not found', async () => {
      mockAuthService.currentUser.mockReturnValue(null);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/payment' } as RouterStateSnapshot;

      const result = await runInInjectionContext(injector, () => userRoleGuard(route, state));

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
    });

    it('allows user with USER role', async () => {
      mockAuthService.currentUser.mockReturnValue({ id: 1, email: 'user@example.com', role: 'USER' });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/payment' } as RouterStateSnapshot;

      const result = await runInInjectionContext(injector, () => userRoleGuard(route, state));

      expect(result).toBe(true);
    });

    it('redirects ADMIN away to /admin when attempting to access /payment', async () => {
      mockAuthService.currentUser.mockReturnValue({ id: 2, email: 'admin@example.com', role: 'ADMIN' });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/payment' } as RouterStateSnapshot;

      const result = await runInInjectionContext(injector, () => userRoleGuard(route, state));

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/admin']);
      expect(result).toEqual({
        commands: ['/admin'],
        extras: undefined,
      });
    });
  });
});

