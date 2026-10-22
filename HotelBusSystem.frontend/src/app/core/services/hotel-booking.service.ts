import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HotelBookingDTO, HotelBookingRequestDTO } from '../models/Hotel/hotel-booking.model';
import { PageHotelBookingDTO, HotelBookingListParams } from '../models/Pagination/hotelBookingPage.model';
import { handleError } from '../../../utils/ErrorHandling';


@Injectable({
  providedIn: 'root',
})
export class HotelBookingService {
  private readonly apiUrl = `${environment.apiBaseUrl}/hotel-bookings`;
  private readonly http = inject(HttpClient);

  /**
   * POST /hotel-bookings
   * Create a new hotel booking
   */
  createHotelBooking(payload: HotelBookingRequestDTO): Observable<HotelBookingDTO> {
    return this.http.post<HotelBookingDTO>(this.apiUrl, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /hotel-bookings/{id}
   * Get a specific hotel booking by ID
   */
  getHotelBookingById(id: number): Observable<HotelBookingDTO> {
    return this.http.get<HotelBookingDTO>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /hotel-bookings
   * Get all hotel bookings paginated (Admin)
   */
  getAllHotelBookings(params: HotelBookingListParams = {}): Observable<PageHotelBookingDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);

    return this.http.get<PageHotelBookingDTO>(this.apiUrl, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /hotel-bookings/user/{userId}
   * Get hotel bookings by user ID paginated (Admin)
   */
  getHotelBookingsByUserId(userId: number, params: HotelBookingListParams = {}): Observable<PageHotelBookingDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);

    return this.http.get<PageHotelBookingDTO>(`${this.apiUrl}/user/${userId}`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /hotel-bookings/my-bookings
   * Get hotel bookings of the currently authenticated user
   */
  getMyHotelBookings(params: HotelBookingListParams = {}): Observable<PageHotelBookingDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);

    return this.http.get<PageHotelBookingDTO>(`${this.apiUrl}/my-bookings`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /hotel-bookings/hotel/{hotelId}
   * Get hotel bookings by hotel ID paginated
   */
  getHotelBookingsByHotelId(hotelId: number, params: HotelBookingListParams = {}): Observable<PageHotelBookingDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);

    return this.http.get<PageHotelBookingDTO>(`${this.apiUrl}/hotel/${hotelId}`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * PUT /hotel-bookings/{id}
   * Update a hotel booking
   */
  updateHotelBooking(id: number, payload: HotelBookingRequestDTO): Observable<HotelBookingDTO> {
    return this.http.put<HotelBookingDTO>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * DELETE /hotel-bookings/{id}
   * Delete a hotel booking
   */
  deleteHotelBooking(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

  // private handleError(error: HttpErrorResponse) {
  //   let message = 'Something went wrong';

  //   if (error.error instanceof ErrorEvent) {
  //     message = `Client Error: ${error.error.message}`;
  //   } else {
  //     message = `Server Error [${error.status}]: ${error.message}`;
  //   }

  //   console.error(message);
  //   return throwError(() => new Error(message));
  // }
}
