import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HotelBookingDTO, HotelBookingRequestDTO, StatusUpdateRequestDTO, status } from '../models/Hotel/hotel-booking.model';
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

    // Spring Data Pageable uses sort=property,asc|desc
    const sortProp = params.sortBy || 'id';
    const sortDir = params.sortDirection || 'desc';
    httpParams = httpParams.set('sort', `${sortProp},${sortDir}`);

    // Backend JPQL: WHERE (:status = 'ANY' OR hb.status = :status)
    // If status is omitted/null, the query fails to match. Default to 'ANY'.
    httpParams = httpParams.set('status', params.status || 'ANY');

    if (params.checkInAfter) httpParams = httpParams.set('checkInAfter', params.checkInAfter);
    if (params.checkInBefore) httpParams = httpParams.set('checkInBefore', params.checkInBefore);
    if (params.userId) httpParams = httpParams.set('userId', params.userId);
    if (params.hotelId) httpParams = httpParams.set('hotelId', params.hotelId);

    return this.http.get<PageHotelBookingDTO>(this.apiUrl, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /hotel-bookings/user/{userId}
   * Get hotel bookings by user ID (Admin or booking owner)
   */
  getHotelBookingsByUserId(userId: number): Observable<HotelBookingDTO[]> {
    return this.http.get<HotelBookingDTO[]>(`${this.apiUrl}/user/${userId}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /hotel-bookings/my
   * Get hotel bookings of the currently authenticated user
   */
  getMyHotelBookings(): Observable<HotelBookingDTO[]> {
    return this.http.get<HotelBookingDTO[]>(`${this.apiUrl}/my`).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /hotel-bookings/hotel/{hotelId}
   * Get hotel bookings by hotel ID
   */
  getHotelBookingsByHotelId(hotelId: number): Observable<HotelBookingDTO[]> {
    return this.http.get<HotelBookingDTO[]>(`${this.apiUrl}/hotel/${hotelId}`).pipe(
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
   * PATCH /hotel-bookings/{id}/status
   * Update hotel booking status (Admin only)
   */
  updateHotelBookingStatus(id: number, status: status | string): Observable<HotelBookingDTO> {
    const payload: StatusUpdateRequestDTO = { status: status as status };
    return this.http.patch<HotelBookingDTO>(`${this.apiUrl}/${id}/status`, payload).pipe(
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

}

