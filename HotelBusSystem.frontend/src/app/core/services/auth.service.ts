import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { LoginRequest } from '../models/Auth/login.model';
import { RegisterRequest } from '../models/Auth/register.model';
import { AuthResponse } from '../models/Auth/auth-response.model';
import { UserDto } from '../models/User/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  // State management signals
  private readonly currentUserSignal = signal<UserDto | null>(null);
  private readonly isLoadingSignal = signal<boolean>(false);
  private readonly isInitializedSignal = signal<boolean>(false);

  // Read-only public signals
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isInitialized = this.isInitializedSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly userRole = computed(() => this.currentUserSignal()?.role ?? null);

  // In-flight initialization promise to prevent duplicate concurrent /auth/me checks
  private initPromise: Promise<UserDto | null> | null = null;


  signup(payload: RegisterRequest): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);
    return this.http.post<AuthResponse>(`${this.baseUrl}/signup`, payload).pipe(
      tap((res) => {
        this.isLoadingSignal.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }


  login(payload: LoginRequest): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap((res) => {
        this.isLoadingSignal.set(false);
        // Map login response to current user state
        const user: UserDto = {
          id: res.id,
          name: res.name,
          email: res.email,
          phoneNumber: res.phoneNumber,
          role: res.role,
        };
        this.currentUserSignal.set(user);
        this.isInitializedSignal.set(true);
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }


  logout(): Observable<string> {
    this.isLoadingSignal.set(true);
    return this.http.post(`${this.baseUrl}/logout`, {}, { responseType: 'text' }).pipe(
      tap(() => {
        this.currentUserSignal.set(null);
        this.isLoadingSignal.set(false);
        this.isInitializedSignal.set(true);
      }),
      catchError((error) => {
        // Even if the server returns an error, reset local client authentication state
        this.currentUserSignal.set(null);
        this.isLoadingSignal.set(false);
        this.isInitializedSignal.set(true);
        return throwError(() => error);
      })
    );
  }

  
  getMe(): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.baseUrl}/me`).pipe(
      tap((user) => {
        this.currentUserSignal.set(user);
        this.isInitializedSignal.set(true);
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          this.currentUserSignal.set(null);
        }
        this.isInitializedSignal.set(true);
        return throwError(() => error);
      })
    );
  }


  ensureInitialized(): Promise<UserDto | null> {
    if (this.isInitializedSignal()) {
      return Promise.resolve(this.currentUserSignal());
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      this.getMe().subscribe({
        next: (user) => {
          this.initPromise = null;
          resolve(user);
        },
        error: () => {
          this.initPromise = null;
          resolve(null);
        },
      });
    });

    return this.initPromise;
  }
}
