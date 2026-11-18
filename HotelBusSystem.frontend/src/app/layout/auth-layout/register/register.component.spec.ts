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

  it('should enforce password minimum length of 8 characters', () => {
    component.registerForm.controls['password'].setValue('1234567');
    expect(component.registerForm.controls['password'].invalid).toBe(true);
    expect(component.registerForm.controls['password'].errors?.['minlength']).toBeDefined();

    component.registerForm.controls['password'].setValue('12345678');
    expect(component.registerForm.controls['password'].valid).toBe(true);
  });

  it('should validate phone numbers accepting spaces and enforcing 10 to 15 digits', () => {
    component.registerForm.controls['phoneNumber'].setValue('12345');
    expect(component.registerForm.controls['phoneNumber'].invalid).toBe(true);

    component.registerForm.controls['phoneNumber'].setValue('+20 100 000 0000');
    expect(component.registerForm.controls['phoneNumber'].valid).toBe(true);
  });

  it('should strip whitespace from phone number when submitting', () => {
    const { of } = require('rxjs');
    mockAuthService.signup.mockReturnValue(of({}));
    component.registerForm.controls['name'].setValue('John Doe');
    component.registerForm.controls['email'].setValue('john@example.com');
    component.registerForm.controls['phoneNumber'].setValue('+20 100 000 0000');
    component.registerForm.controls['password'].setValue('password123');

    component.onSubmit();

    expect(mockAuthService.signup).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      phoneNumber: '+201000000000',
      password: 'password123',
    });
  });
});
