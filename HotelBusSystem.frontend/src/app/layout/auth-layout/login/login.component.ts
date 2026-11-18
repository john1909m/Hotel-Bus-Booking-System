import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';
import { LoginRequest } from '../../../core/models/Auth/login.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
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
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
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

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: LoginRequest = {
      email: this.loginForm.value.email.trim(),
      password: this.loginForm.value.password,
    };

    this.authService.login(payload).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        console.log(returnUrl);
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else if (response.role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        if (err.status === 401 || err.status === 400) {
          this.errorMessage.set(this.translate.instant('auth.invalidCredentials'));
        } else if (err.status === 0) {
          this.errorMessage.set(this.translate.instant('auth.networkError'));
        } else {
          this.errorMessage.set(err.error?.message || this.translate.instant('auth.genericAuthError'));
        }
      },
    });
  }
}
