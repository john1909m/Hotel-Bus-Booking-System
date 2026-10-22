import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HotelDTO, HotelRequestDTO } from '../models/Hotel/hotel.model';
import { PageHotelDTO, HotelListParams, HotelLookupParams } from '../models/Pagination/hotelPage.model';
import { environment } from '../../../environments/environment';
import { handleError } from '../../../utils/ErrorHandling';



@Injectable({
  providedIn: 'root',
})
export class HotelService {
  private readonly apiUrl = `${environment.apiBaseUrl}/hotels`;
  private readonly http = inject(HttpClient);

  /**
   * GET /hotels
   * Hotel Listing Page with optional pagination and filtering.
   * No authentication required.
   */
  getHotels(params: HotelListParams = {}): Observable<PageHotelDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.city) httpParams = httpParams.set('city', params.city);
    if (params.minRating !== undefined) httpParams = httpParams.set('minRating', params.minRating);
    if (params.maxPrice !== undefined) httpParams = httpParams.set('maxPrice', params.maxPrice);

    return this.http.get<PageHotelDTO>(this.apiUrl, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /hotels/lookup
   * Search dropdown / autocomplete with optional search and city filters.
   * No authentication required.
   */
  lookupHotels(params: HotelLookupParams = {}): Observable<PageHotelDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.q) httpParams = httpParams.set('q', params.q);

    return this.http.get<PageHotelDTO>(`${this.apiUrl}/lookup`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /hotels/{id}
   * Get a specific hotel by ID.
   * No authentication required.
   */
  getHotelById(id: number): Observable<HotelDTO> {
    return this.http.get<HotelDTO>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * POST /hotels
   * Add a new hotel. Requires ADMIN role.
   */
  createHotel(payload: HotelRequestDTO): Observable<HotelDTO> {
    return this.http.post<HotelDTO>(this.apiUrl, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * PUT /hotels/{id}
   * Edit a specific hotel. Requires ADMIN role.
   */
  updateHotel(id: number, payload: HotelRequestDTO): Observable<HotelDTO> {
    return this.http.put<HotelDTO>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * DELETE /hotels/{id}
   * Delete a specific hotel. Requires ADMIN role.
   */
  deleteHotel(id: number): Observable<void> {
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

