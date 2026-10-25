import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BusBookingDTO, BusBookingRequestDTO } from '../models/Bus/bus-booking.model';
import { PageBusBookingDTO, BusBookingListParams } from '../models/Pagination/busBookingPage.model';
import { environment } from '../../../environments/environment';
import { handleError } from '../../../utils/ErrorHandling';



@Injectable({
  providedIn: 'root',
})
export class BusBookingService {
  private readonly apiUrl = `${environment.apiBaseUrl}/bus-bookings`;
  private readonly http = inject(HttpClient);

  /**
   * POST /bus-bookings
   * Create a new bus booking
   */
  createBusBooking(payload: BusBookingRequestDTO): Observable<BusBookingDTO> {
    return this.http.post<BusBookingDTO>(this.apiUrl, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-bookings/{id}
   * Get a specific bus booking by ID
   */
  getBusBookingById(id: number): Observable<BusBookingDTO> {
    return this.http.get<BusBookingDTO>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-bookings
   * Get all bus bookings paginated (Admin)
   */
  getAllBusBookings(params: BusBookingListParams = {}): Observable<PageBusBookingDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);

    return this.http.get<PageBusBookingDTO>(this.apiUrl, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-bookings/bus-trip/{busTripId}
   * Get bus bookings for a specific bus trip
   */
  getBusBookingsByBusTripId(busTripId: number, params: BusBookingListParams = {}): Observable<PageBusBookingDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);

    return this.http.get<PageBusBookingDTO>(`${this.apiUrl}/bus-trip/${busTripId}`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-bookings/user/{userId}
   * Get bus bookings for a specific user (Admin)
   */
  getBusBookingsByUserId(userId: number, params: BusBookingListParams = {}): Observable<PageBusBookingDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);

    return this.http.get<PageBusBookingDTO>(`${this.apiUrl}/user/${userId}`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-bookings/my-bookings
   * Get bookings of the currently authenticated user
   */
  getMyBusBookings(params: BusBookingListParams = {}): Observable<PageBusBookingDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);

    return this.http.get<PageBusBookingDTO>(`${this.apiUrl}/my-bookings`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * PUT /bus-bookings/{id}
   * Update a bus booking
   */
  updateBusBooking(id: number, payload: BusBookingRequestDTO): Observable<BusBookingDTO> {
    return this.http.put<BusBookingDTO>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * DELETE /bus-bookings/{id}
   * Delete a bus booking
   */
  deleteBusBooking(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

}
