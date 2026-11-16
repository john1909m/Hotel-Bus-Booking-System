import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let mockThemeService: any;
  let mockLanguageService: any;
  let mockTranslateService: any;
  let mockAuthService: any;
  let mockRouter: any;
  let injector: Injector;

  beforeEach(() => {
    mockThemeService = {
      theme: signal('light'),
      toggle: vi.fn(),
    };
    mockLanguageService = {
      currentLanguage: signal('en'),
      toggleLanguage: vi.fn(),
    };
    mockTranslateService = {
      instant: vi.fn((key: string) => key),
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
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: TranslateService, useValue: mockTranslateService },
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

  it('should toggle language using LanguageService', () => {
    component.toggleLanguage();
    expect(mockLanguageService.toggleLanguage).toHaveBeenCalledTimes(1);
  });
});
