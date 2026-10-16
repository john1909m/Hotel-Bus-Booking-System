import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserDto, UserRequestDto } from '../models/User/user.model';
import { PageUserDto } from '../models/Pagination/userPage.model';
import { environment } from '../../../environments/environment';

export interface UserListParams {
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = `${environment.apiBaseUrl}/users`;
  private readonly http = inject(HttpClient);

  /**
   * GET /users
   * Get all users with optional pagination and filtering (Admin).
   * Response: PageUserDto
   */
  getUsers(params: UserListParams = {}): Observable<PageUserDto> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.role) httpParams = httpParams.set('role', params.role);

    return this.http.get<PageUserDto>(this.apiUrl, { params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * GET /users
   * Convenience alias for getUsers().
   */
  getAllUsers(params: UserListParams = {}): Observable<PageUserDto> {
    return this.getUsers(params);
  }

  /**
   * GET /users/{id}
   * Get specific user by ID (Self or Admin).
   * Response: UserDto
   */
  getUserById(id: number): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * GET /users/email/{email}
   * Get specific user by Email (Admin).
   * Response: UserDto
   */
  getUserByEmail(email: string): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.apiUrl}/email/${encodeURIComponent(email)}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * POST /users
   * Add new user (Admin).
   * Request Body: UserRequestDto
   * Response: UserDto
   */
  createUser(payload: UserRequestDto): Observable<UserDto> {
    return this.http.post<UserDto>(this.apiUrl, payload).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * PUT /users/{id}
   * Update specific user data (Self or Admin).
   * Request Body: UserRequestDto
   * Response: UserDto
   */
  updateUser(id: number, payload: UserRequestDto): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * DELETE /users/{id}
   * Delete specific user data (Admin).
   * Response: void (HTTP 204 No Content)
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let message = 'Something went wrong';

    if (error.error instanceof ErrorEvent) {
      message = `Client Error: ${error.error.message}`;
    } else {
      message = `Server Error [${error.status}]: ${error.message}`;
    }

    console.error(message);
    return throwError(() => new Error(message));
  }
}
