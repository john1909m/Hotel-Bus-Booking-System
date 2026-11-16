import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let mockThemeService: any;
  let mockAuthService: any;
  let mockRouter: any;
  let mockRoute: any;
  let injector: Injector;

  beforeEach(() => {
    mockThemeService = {
      theme: signal('light'),
      toggle: vi.fn(),
    };
    mockAuthService = {
      login: vi.fn(),
      currentUser: signal(null),
    };
    mockRouter = {
      navigate: vi.fn(),
      navigateByUrl: vi.fn(),
    };
    mockRoute = {
      snapshot: { queryParams: {} },
    };

    injector = Injector.create({
      providers: [
        FormBuilder,
        { provide: ThemeService, useValue: mockThemeService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        LoginComponent,
      ],
    });

    component = runInInjectionContext(injector, () => injector.get(LoginComponent));
  });

  it('should be defined', () => {
    expect(component).toBeDefined();
  });

  it('should toggle theme using ThemeService', () => {
    component.toggleTheme();
    expect(mockThemeService.toggle).toHaveBeenCalledTimes(1);
  });
});
