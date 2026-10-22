import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BusTripDTO, BusTripRequestDTO, status , BusTripListParams, BusTripLookupParams} from '../models/Bus/bus-trip.model';
import { PageBusTripDTO } from '../models/Pagination/busTripPage.model';
import { handleError } from '../../../utils/ErrorHandling';



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
      catchError(handleError)
    );
  }

  /**
   * GET /bus-trips/{id}
   * Get bus trip by ID
   */
  getBusTripById(id: number): Observable<BusTripDTO> {
    return this.http.get<BusTripDTO>(`${this.apiUrl}/${id}`).pipe(
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
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.departureAfter) httpParams = httpParams.set('departureAfter', params.departureAfter);
    if (params.departureBefore) httpParams = httpParams.set('departureBefore', params.departureBefore);

    return this.http.get<PageBusTripDTO>(this.apiUrl, { params: httpParams }).pipe(
      catchError(handleError)
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
