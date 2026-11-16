import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let mockThemeService: any;
  let mockAuthService: any;
  let mockRouter: any;
  let injector: Injector;

  beforeEach(() => {
    mockThemeService = {
      theme: signal('light'),
      toggle: vi.fn(),
    };
    mockAuthService = {
      signup: vi.fn(),
      currentUser: signal(null),
    };
    mockRouter = {
      navigate: vi.fn(),
    };

    injector = Injector.create({
      providers: [
        FormBuilder,
        { provide: ThemeService, useValue: mockThemeService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        RegisterComponent,
      ],
    });

    component = runInInjectionContext(injector, () => injector.get(RegisterComponent));
  });

  it('should be defined', () => {
    expect(component).toBeDefined();
  });

  it('should toggle theme using ThemeService', () => {
    component.toggleTheme();
    expect(mockThemeService.toggle).toHaveBeenCalledTimes(1);
  });
});
