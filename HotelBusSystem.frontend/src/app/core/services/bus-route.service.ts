import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BusRouteDTO, BusRouteRequestDTO } from '../models/Bus/bus-route';
import { BusRouteListParams, BusRouteLookupParams, PageBusRouteDTO } from '../models/Pagination/busRoutePage.model';
import { handleError } from '../utils/ErrorHandling';

@Injectable({
  providedIn: 'root',
})
export class BusRouteService {
  private readonly apiUrl = `${environment.apiBaseUrl}/bus-routes`;
  private readonly http = inject(HttpClient);

  /**
   * POST /bus-routes
   * Create a new bus route (Admin)
   */
  createBusRoute(payload: BusRouteRequestDTO): Observable<BusRouteDTO> {
    return this.http.post<BusRouteDTO>(this.apiUrl, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-routes/{id}
   * Get a specific bus route by ID
   */
  getBusRouteById(id: number): Observable<BusRouteDTO> {
    return this.http.get<BusRouteDTO>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-routes
   * Get all bus routes paginated
   */
  getAllBusRoutes(params: BusRouteListParams = {}): Observable<PageBusRouteDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    if (params.originStopId !== undefined) httpParams = httpParams.set('originStopId', params.originStopId);
    if (params.destinationStopId !== undefined) httpParams = httpParams.set('destinationStopId', params.destinationStopId);

    return this.http.get<PageBusRouteDTO>(this.apiUrl, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * Fetches the complete catalog of bus routes by paginating through all pages
   * (page size 100, backend max-page-size).
   */
  getAllBusRoutesCatalog(): Observable<BusRouteDTO[]> {
    return this.getAllBusRoutes({ page: 0, size: 100 }).pipe(
      switchMap((firstPage) => {
        const total = firstPage.totalElements ?? firstPage.content?.length ?? 0;
        const firstBatch = firstPage.content ?? [];
        if (firstBatch.length >= total || firstPage.last) {
          return of(firstBatch);
        }
        const totalPages = Math.ceil(total / 100);
        const pageRequests: Observable<PageBusRouteDTO>[] = [];
        for (let p = 1; p < totalPages; p++) {
          pageRequests.push(this.getAllBusRoutes({ page: p, size: 100 }));
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
   * GET /bus-routes/lookup
   * Lookup bus routes for dropdowns / autocomplete
   */
  lookupBusRoutes(params: BusRouteLookupParams = {}): Observable<BusRouteDTO[]> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);

    return this.http.get<BusRouteDTO[]>(`${this.apiUrl}/lookup`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * PUT /bus-routes/{id}
   * Update a bus route (Admin)
   */
  updateBusRoute(id: number, payload: BusRouteRequestDTO): Observable<BusRouteDTO> {
    return this.http.put<BusRouteDTO>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * DELETE /bus-routes/{id}
   * Delete a bus route (Admin)
   */
  deleteBusRoute(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }
}
