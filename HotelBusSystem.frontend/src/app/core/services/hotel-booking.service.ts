import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HotelBookingDTO, HotelBookingRequestDTO, StatusUpdateRequestDTO, status } from '../models/Hotel/hotel-booking.model';
import { PageHotelBookingDTO, HotelBookingListParams } from '../models/Pagination/hotelBookingPage.model';
import { handleError } from '../utils/ErrorHandling';

export interface StoredGuestBreakdown {
  adults: number;
  childAges: number[];
}

const GUEST_BREAKDOWN_STORAGE_KEY = 'travel_ease_booking_guest_breakdowns';

@Injectable({
  providedIn: 'root',
})
export class HotelBookingService {
  private readonly apiUrl = `${environment.apiBaseUrl}/hotel-bookings`;
  private readonly http = inject(HttpClient);

  /**
   * Reads saved guest breakdown dictionary from localStorage.
   */
  private getSavedBreakdownsMap(): Record<number, StoredGuestBreakdown> {
    if (typeof localStorage === 'undefined') {
      return {};
    }
    try {
      const raw = localStorage.getItem(GUEST_BREAKDOWN_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Retrieves saved guest breakdown for a specific booking ID.
   */
  getSavedGuestBreakdown(bookingId: number): StoredGuestBreakdown | null {
    if (!bookingId) return null;
    const map = this.getSavedBreakdownsMap();
    return map[bookingId] || null;
  }

  /**
   * Persists guest breakdown for a booking ID into localStorage.
   */
  saveGuestBreakdown(bookingId: number, data: StoredGuestBreakdown): void {
    if (!bookingId || typeof localStorage === 'undefined') {
      return;
    }
    try {
      const current = this.getSavedBreakdownsMap();
      current[bookingId] = {
        adults: Math.max(1, data.adults),
        childAges: Array.isArray(data.childAges) ? [...data.childAges] : [],
      };
      localStorage.setItem(GUEST_BREAKDOWN_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to save guest breakdown to localStorage:', e);
    }
  }

  /**
   * Enriches a HotelBookingDTO with accurate client-side guest breakdown if the backend entity dropped them.
   */
  enrichBookingWithBreakdown(dto: HotelBookingDTO): HotelBookingDTO {
    if (!dto || !dto.id) return dto;

    const stored = this.getSavedGuestBreakdown(dto.id);
    if (stored) {
      return {
        ...dto,
        adults: stored.adults,
        childAges: stored.childAges,
        guests: dto.guests || (stored.adults + stored.childAges.length),
      };
    }

    // If dto already has childAges returned from backend create/update, save it to storage
    if (Array.isArray(dto.childAges) && dto.childAges.length > 0 && dto.adults) {
      this.saveGuestBreakdown(dto.id, {
        adults: dto.adults,
        childAges: dto.childAges,
      });
    }

    return dto;
  }

  /**
   * POST /hotel-bookings
   * Create a new hotel booking
   */
  createHotelBooking(payload: HotelBookingRequestDTO): Observable<HotelBookingDTO> {
    return this.http.post<HotelBookingDTO>(this.apiUrl, payload).pipe(
      tap((res) => {
        if (res && res.id) {
          const effectiveAdults = payload.adults ?? res.adults ?? payload.guests ?? 1;
          const effectiveChildren = payload.childAges ?? res.childAges ?? [];
          this.saveGuestBreakdown(res.id, {
            adults: effectiveAdults,
            childAges: effectiveChildren,
          });
        }
      }),
      map((res) => this.enrichBookingWithBreakdown(res)),
      catchError(handleError)
    );
  }

  /**
   * GET /hotel-bookings/{id}
   * Get a specific hotel booking by ID
   */
  getHotelBookingById(id: number): Observable<HotelBookingDTO> {
    return this.http.get<HotelBookingDTO>(`${this.apiUrl}/${id}`).pipe(
      map((res) => this.enrichBookingWithBreakdown(res)),
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
      map((page) => {
        if (!page || !Array.isArray(page.content)) return page;
        return {
          ...page,
          content: page.content.map((b) => this.enrichBookingWithBreakdown(b)),
        };
      }),
      catchError(handleError)
    );
  }

  /**
   * GET /hotel-bookings/user/{userId}
   * Get hotel bookings by user ID (Admin or booking owner)
   */
  getHotelBookingsByUserId(userId: number): Observable<HotelBookingDTO[]> {
    return this.http.get<HotelBookingDTO[]>(`${this.apiUrl}/user/${userId}`).pipe(
      map((list) => (Array.isArray(list) ? list.map((b) => this.enrichBookingWithBreakdown(b)) : [])),
      catchError(handleError)
    );
  }

  /**
   * GET /hotel-bookings/my
   * Get hotel bookings of the currently authenticated user
   */
  getMyHotelBookings(): Observable<HotelBookingDTO[]> {
    return this.http.get<HotelBookingDTO[]>(`${this.apiUrl}/my`).pipe(
      map((list) => (Array.isArray(list) ? list.map((b) => this.enrichBookingWithBreakdown(b)) : [])),
      catchError(handleError)
    );
  }

  /**
   * GET /hotel-bookings/hotel/{hotelId}
   * Get hotel bookings by hotel ID
   */
  getHotelBookingsByHotelId(hotelId: number): Observable<HotelBookingDTO[]> {
    return this.http.get<HotelBookingDTO[]>(`${this.apiUrl}/hotel/${hotelId}`).pipe(
      map((list) => (Array.isArray(list) ? list.map((b) => this.enrichBookingWithBreakdown(b)) : [])),
      catchError(handleError)
    );
  }

  /**
   * PUT /hotel-bookings/{id}
   * Update a hotel booking
   */
  updateHotelBooking(id: number, payload: HotelBookingRequestDTO): Observable<HotelBookingDTO> {
    return this.http.put<HotelBookingDTO>(`${this.apiUrl}/${id}`, payload).pipe(
      tap((res) => {
        if (id) {
          const effectiveAdults = payload.adults ?? res?.adults ?? payload.guests ?? 1;
          const effectiveChildren = payload.childAges ?? res?.childAges ?? [];
          this.saveGuestBreakdown(id, {
            adults: effectiveAdults,
            childAges: effectiveChildren,
          });
        }
      }),
      map((res) => this.enrichBookingWithBreakdown(res)),
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
      map((res) => this.enrichBookingWithBreakdown(res)),
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

