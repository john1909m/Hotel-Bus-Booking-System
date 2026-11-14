import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserDto, UserRequestDto, UserListParams} from '../models/User/user.model';
import { PageUserDto } from '../models/Pagination/userPage.model';
import { environment } from '../../../environments/environment';
import { handleError } from '../utils/ErrorHandling';

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

    return this.http.get<any>(this.apiUrl, { params: httpParams }).pipe(
      map((res) => {
        const totalElements = res?.page?.totalElements ?? res?.totalElements ?? res?.content?.length ?? 0;
        const totalPages = res?.page?.totalPages ?? res?.totalPages ?? (totalElements > 0 ? 1 : 0);
        const size = res?.page?.size ?? res?.size ?? 10;
        const number = res?.page?.number ?? res?.number ?? 0;
        return {
          ...res,
          totalElements,
          totalPages,
          size,
          number,
        } as PageUserDto;
      }),
      catchError(handleError)
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
      catchError(handleError)
    );
  }

  /**
   * GET /users/email/{email}
   * Get specific user by Email (Admin).
   * Response: UserDto
   */
  getUserByEmail(email: string): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.apiUrl}/email/${encodeURIComponent(email)}`).pipe(
      catchError(handleError)
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
      catchError(handleError)
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
      catchError(handleError)
    );
  }

  /**
   * DELETE /users/{id}
   * Delete specific user data (Admin).
   * Response: void (HTTP 204 No Content)
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

}
