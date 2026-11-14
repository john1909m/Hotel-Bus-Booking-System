import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BusStopDto, BusStopRequestDto } from '../models/Bus/bus-stop.model';
import { BusStopListParams, BusStopLookupParams, PageBusStopDTO } from '../models/Pagination/busStopPage.model';
import { handleError } from '../utils/ErrorHandling';

@Injectable({
  providedIn: 'root',
})
export class BusStopService {
  private readonly apiUrl = `${environment.apiBaseUrl}/bus-stops`;
  private readonly http = inject(HttpClient);

  /**
   * POST /bus-stops
   * Create a new bus stop (Admin)
   */
  createBusStop(payload: BusStopRequestDto): Observable<BusStopDto> {
    return this.http.post<BusStopDto>(this.apiUrl, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-stops/{id}
   * Get a specific bus stop by ID
   */
  getBusStopById(id: number): Observable<BusStopDto> {
    return this.http.get<BusStopDto>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-stops
   * Get paginated bus stops with optional search and city filters
   */
  getAllBusStops(params: BusStopListParams = {}): Observable<PageBusStopDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.city) httpParams = httpParams.set('city', params.city);

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
        } as PageBusStopDTO;
      }),
      catchError(handleError)
    );
  }

  /**
   * Loads all bus stops by iterating over pages capped at 100 (Spring Data max-page-size).
   * Used for client-side operations such as partial city filtering.
   */
  getAllBusStopsCatalog(): Observable<BusStopDto[]> {
    return this.getAllBusStops({ page: 0, size: 100 }).pipe(
      switchMap((firstPage) => {
        const total = firstPage.totalElements ?? firstPage.content?.length ?? 0;
        const firstBatch = firstPage.content ?? [];
        if (firstBatch.length >= total || firstPage.last) {
          return of(firstBatch);
        }
        const totalPages = Math.ceil(total / 100);
        const pageRequests: Observable<PageBusStopDTO>[] = [];
        for (let p = 1; p < totalPages; p++) {
          pageRequests.push(this.getAllBusStops({ page: p, size: 100 }));
        }
        return forkJoin(pageRequests).pipe(
          map((pages) => {
            const all = [...firstBatch];
            for (const pg of pages) {
              if (pg.content) all.push(...pg.content);
            }
            return all;
          })
        );
      })
    );
  }

  /**
   * GET /bus-stops/lookup
   * Lookup bus stops for autocomplete / dropdowns
   */
  lookupBusStops(params: BusStopLookupParams = {}): Observable<BusStopDto[]> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.q) httpParams = httpParams.set('q', params.q);

    return this.http.get<BusStopDto[]>(`${this.apiUrl}/lookup`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * PUT /bus-stops/{id}
   * Update a bus stop (Admin)
   */
  updateBusStop(id: number, payload: BusStopRequestDto): Observable<BusStopDto> {
    return this.http.put<BusStopDto>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * DELETE /bus-stops/{id}
   * Delete a bus stop (Admin)
   */
  deleteBusStop(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

}
