import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { HotelDTO, HotelRequestDTO } from '../models/Hotel/hotel.model';
import { PageHotelDTO, HotelListParams, HotelLookupParams } from '../models/Pagination/hotelPage.model';
import { environment } from '../../../environments/environment';
import { handleError } from '../utils/ErrorHandling';



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
        } as PageHotelDTO;
      }),
      catchError(handleError)
    );
  }

  /**
   * Loads all hotels by iterating over pages capped at 100 (Spring Data max-page-size).
   * Used for client-side operations such as partial city filtering.
   */
  getAllHotels(): Observable<HotelDTO[]> {
    return this.getHotels({ page: 0, size: 100 }).pipe(
      switchMap((firstPage) => {
        const total =
          firstPage.page?.totalElements ??
          firstPage.totalElements ??
          firstPage.content?.length ??
          0;
        const firstBatch = firstPage.content ?? [];
        if (firstBatch.length >= total || firstPage.last) {
          return of(firstBatch);
        }

        const totalPages = Math.ceil(total / 100);
        const requests: Observable<PageHotelDTO>[] = [];
        for (let p = 1; p < totalPages; p++) {
          requests.push(this.getHotels({ page: p, size: 100 }));
        }

        return forkJoin(requests).pipe(
          map((pages) => [firstBatch, ...pages.map((pg) => pg.content ?? [])].flat())
        );
      })
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

}

