import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterRequest } from '../../../core/models/Auth/register.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
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

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9+ ]{8,15}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
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
      phoneNumber: this.registerForm.value.phoneNumber.trim(),
      password: this.registerForm.value.password,
    };

    this.authService.signup(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        // Backend /signup does NOT set HttpOnly session cookie, so user must log in.
        this.router.navigate(['/login'], {
          queryParams: { registered: 'true' },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        if (err.status === 400 && err.error?.message?.includes('Email.already.exists')) {
          this.errorMessage.set('This email address is already registered. Please sign in or use another email.');
        } else if (err.status === 0) {
          this.errorMessage.set('Cannot connect to server. Please check your network connection.');
        } else {
          this.errorMessage.set(err.error?.message || 'Registration failed. Please check your details and try again.');
        }
      },
    });
  }
}
