import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';
import { RegisterRequest } from '../../../core/models/Auth/register.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly languageService = inject(LanguageService);
  readonly themeService = inject(ThemeService);

  readonly theme = this.themeService.theme;
  readonly currentLanguage = this.languageService.currentLanguage;
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  private static validatePhone(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const clean = String(control.value).replace(/\s+/g, '');
    const valid = /^\+?[0-9]{11,15}$/.test(clean);
    return valid ? null : { pattern: true };
  }

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, RegisterComponent.validatePhone]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit(): void {
    if (this.registerForm.invalid || this.isSubmitting()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: RegisterRequest = {
      name: this.registerForm.value.name.trim(),
      email: this.registerForm.value.email.trim(),
      phoneNumber: String(this.registerForm.value.phoneNumber).trim().replace(/\s+/g, ''),
      password: this.registerForm.value.password,
    };

    this.authService.signup(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        // Backend /signup does NOT set HttpOnly session cookie, so user must log in.
        // this.router.navigate(['/login'], {
        //   queryParams: { registered: 'true' },
        // });
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        const rawMsg = err.error?.message || (typeof err.error === 'string' ? err.error : '') || '';
        if (err.status === 400 && (rawMsg.includes('Email.already.exists') || rawMsg.includes('already registered'))) {
          this.errorMessage.set(this.translate.instant('auth.emailAlreadyRegistered'));
        } else if (err.status === 400 && rawMsg.includes('Size.password')) {
          this.errorMessage.set(this.translate.instant('auth.passwordMinLength'));
        } else if (err.status === 400 && rawMsg.includes('Pattern.phoneNumber')) {
          this.errorMessage.set(this.translate.instant('auth.phoneInvalid'));
        } else if (err.status === 0) {
          this.errorMessage.set(this.translate.instant('auth.networkError'));
        } else {
          this.errorMessage.set(rawMsg || this.translate.instant('auth.registrationFailed'));
        }
      },
    });
  }
}
