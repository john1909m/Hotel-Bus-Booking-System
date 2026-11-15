import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { PublicHeader } from './public-header';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('PublicHeader - Logout Confirmation Flow (Part D)', () => {
  let component: PublicHeader;
  let mockAuthService: any;
  let mockRouter: any;
  let mockThemeService: any;
  let injector: Injector;

  beforeEach(() => {
    mockAuthService = {
      currentUser: signal({ id: 1, name: 'Jane Doe', email: 'jane@example.com', role: 'USER' }),
      isAuthenticated: signal(true),
      ensureInitialized: vi.fn(),
      logout: vi.fn().mockReturnValue(of(null)),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    mockThemeService = {
      theme: signal('light'),
      toggle: vi.fn(),
    };

    injector = Injector.create({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ThemeService, useValue: mockThemeService },
        PublicHeader,
      ],
    });

    component = runInInjectionContext(injector, () => injector.get(PublicHeader));
  });

  it('clicking logout opens confirmation dialog without logging out immediately', () => {
    expect(component.showLogoutConfirm()).toBe(false);

    component.logout();

    expect(component.showLogoutConfirm()).toBe(true);
    expect(mockAuthService.logout).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('cancelling confirmation dialog closes modal and keeps user logged in', () => {
    component.logout();
    expect(component.showLogoutConfirm()).toBe(true);

    component.onLogoutCancelled();

    expect(component.showLogoutConfirm()).toBe(false);
    expect(mockAuthService.logout).not.toHaveBeenCalled();
  });

  it('confirming logout performs sign out and navigates to root', () => {
    component.logout();
    component.onLogoutConfirmed();

    expect(component.showLogoutConfirm()).toBe(false);
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });
});

