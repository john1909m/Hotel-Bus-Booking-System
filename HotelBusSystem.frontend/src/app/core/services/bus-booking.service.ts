import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BusBookingDTO, BusBookingRequestDTO, StatusUpdateRequestDTO, Status } from '../models/Bus/bus-booking.model';
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

    // Spring Data Pageable uses sort=property,asc|desc
    const sortProp = params.sortBy || 'id';
    const sortDir = params.sortDirection || 'desc';
    httpParams = httpParams.set('sort', `${sortProp},${sortDir}`);

    // Backend Specification filters
    if (params.status && params.status !== 'ALL' && params.status !== 'ANY') {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.bookingDateAfter) httpParams = httpParams.set('bookingDateAfter', params.bookingDateAfter);
    if (params.bookingDateBefore) httpParams = httpParams.set('bookingDateBefore', params.bookingDateBefore);
    if (params.userId) httpParams = httpParams.set('userId', params.userId);
    if (params.busTripId) httpParams = httpParams.set('busTripId', params.busTripId);
    if (params.seatId) httpParams = httpParams.set('seatId', params.seatId);

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

    const sortProp = params.sortBy || 'id';
    const sortDir = params.sortDirection || 'desc';
    httpParams = httpParams.set('sort', `${sortProp},${sortDir}`);

    if (params.status && params.status !== 'ALL' && params.status !== 'ANY') {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.bookingDateAfter) httpParams = httpParams.set('bookingDateAfter', params.bookingDateAfter);
    if (params.bookingDateBefore) httpParams = httpParams.set('bookingDateBefore', params.bookingDateBefore);
    if (params.userId) httpParams = httpParams.set('userId', params.userId);

    return this.http.get<PageBusBookingDTO>(`${this.apiUrl}/bus-trip/${busTripId}`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-bookings/user/{userId}
   * Get bus bookings for a specific user (Admin or owner)
   */
  getBusBookingsByUserId(userId: number): Observable<BusBookingDTO[]> {
    return this.http.get<BusBookingDTO[]>(`${this.apiUrl}/user/${userId}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-bookings/my
   * Get bus bookings of the currently authenticated user
   */
  getMyBusBookings(): Observable<BusBookingDTO[]> {
    return this.http.get<BusBookingDTO[]>(`${this.apiUrl}/my`).pipe(
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
   * PATCH /bus-bookings/{id}/status
   * Update bus booking status (Admin only)
   */
  updateBusBookingStatus(id: number, status: Status | string): Observable<BusBookingDTO> {
    const payload: StatusUpdateRequestDTO = { status: status as Status };
    return this.http.patch<BusBookingDTO>(`${this.apiUrl}/${id}/status`, payload).pipe(
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

