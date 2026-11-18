import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BusTripDTO, BusTripRequestDTO, status , BusTripListParams, BusTripLookupParams} from '../models/Bus/bus-trip.model';
import { PageBusTripDTO } from '../models/Pagination/busTripPage.model';
import { handleError } from '../utils/ErrorHandling';



@Injectable({
  providedIn: 'root',
})
export class BusTripService {
  private readonly apiUrl = `${environment.apiBaseUrl}/bus-trips`;
  private readonly http = inject(HttpClient);

  /**
   * POST /bus-trips
   * Create a new bus trip (Admin)
   */
  createBusTrip(payload: BusTripRequestDTO): Observable<BusTripDTO> {
    return this.http.post<BusTripDTO>(this.apiUrl, payload).pipe(
      map((trip) => ({
        ...trip,
        departure: trip.departureTime || trip.departure,
        departureTime: trip.departureTime || trip.departure,
      })),
      catchError(handleError)
    );
  }

  /**
   * GET /bus-trips/{id}
   * Get bus trip by ID
   */
  getBusTripById(id: number): Observable<BusTripDTO> {
    return this.http.get<BusTripDTO>(`${this.apiUrl}/${id}`).pipe(
      map((trip) => ({
        ...trip,
        departure: trip.departureTime || trip.departure,
        departureTime: trip.departureTime || trip.departure,
      })),
      catchError(handleError)
    );
  }

  /**
   * GET /bus-trips
   * Get all bus trips paginated with filtering
   */
  getAllBusTrips(params: BusTripListParams = {}): Observable<PageBusTripDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.busId !== undefined) httpParams = httpParams.set('busId', params.busId);
    if (params.routeId !== undefined) httpParams = httpParams.set('routeId', params.routeId);
    
    // Spring Boot BusTripRepository requires status='ANY' when all trips are requested
    const tripStatus = params.status && params.status !== ('ALL' as any) ? params.status : 'ANY';
    httpParams = httpParams.set('status', tripStatus);

    if (params.departureAfter) httpParams = httpParams.set('departureAfter', params.departureAfter);
    if (params.departureBefore) httpParams = httpParams.set('departureBefore', params.departureBefore);

    return this.http.get<any>(this.apiUrl, { params: httpParams }).pipe(
      map((res) => {
        const totalElements = res?.page?.totalElements ?? res?.totalElements ?? res?.content?.length ?? 0;
        const totalPages = res?.page?.totalPages ?? res?.totalPages ?? (totalElements > 0 ? 1 : 0);
        const size = res?.page?.size ?? res?.size ?? 10;
        const number = res?.page?.number ?? res?.number ?? 0;
        const rawContent = res?.content || res?._embedded?.busTripDtoList || res?._embedded?.busTrips || (Array.isArray(res) ? res : []);
        const content = rawContent.map((t: any) => ({
          ...t,
          departure: t.departureTime || t.departure,
          departureTime: t.departureTime || t.departure,
        }));
        return {
          ...res,
          content,
          totalElements,
          totalPages,
          size,
          number,
        } as PageBusTripDTO;
      }),
      catchError(handleError)
    );
  }

  /**
   * Loads all bus trips by iterating over pages capped at 100 (Spring Data max-page-size).
   * Used for client-side search across relations (bus, route) and displayed fields.
   */
  getAllBusTripsCatalog(): Observable<BusTripDTO[]> {
    return this.getAllBusTrips({ page: 0, size: 100, status: 'ANY' as any }).pipe(
      switchMap((firstPage) => {
        const total = firstPage.totalElements ?? firstPage.content?.length ?? 0;
        const firstBatch = firstPage.content ?? [];
        if (firstBatch.length >= total || firstPage.last) {
          return of(firstBatch);
        }
        const totalPages = Math.ceil(total / 100);
        const pageRequests: Observable<PageBusTripDTO>[] = [];
        for (let p = 1; p < totalPages; p++) {
          pageRequests.push(this.getAllBusTrips({ page: p, size: 100, status: 'ANY' as any }));
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
   * GET /bus-trips/lookup
   * Lookup bus trips for autocomplete / dropdowns
   */
  lookupBusTrips(params: BusTripLookupParams = {}): Observable<BusTripDTO[]> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.q) httpParams = httpParams.set('q', params.q);

    return this.http.get<BusTripDTO[]>(`${this.apiUrl}/lookup`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-trips/bus/{busId}
   * Get all trips for a specific bus
   */
  getBusTripsByBusId(busId: number): Observable<BusTripDTO[]> {
    return this.http.get<BusTripDTO[]>(`${this.apiUrl}/bus/${busId}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /bus-trips/route/{routeId}
   * Get all trips for a specific route
   */
  getBusTripsByRouteId(routeId: number): Observable<BusTripDTO[]> {
    return this.http.get<BusTripDTO[]>(`${this.apiUrl}/route/${routeId}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * PUT /bus-trips/{id}
   * Update a bus trip (Admin)
   */
  updateBusTrip(id: number, payload: BusTripRequestDTO): Observable<BusTripDTO> {
    return this.http.put<BusTripDTO>(`${this.apiUrl}/${id}`, payload).pipe(
      map((trip) => ({
        ...trip,
        departure: trip.departureTime || trip.departure,
        departureTime: trip.departureTime || trip.departure,
      })),
      catchError(handleError)
    );
  }

  /**
   * DELETE /bus-trips/{id}
   * Delete a bus trip (Admin)
   */
  deleteBusTrip(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

}
