import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BusStopDto, BusStopRequestDto } from '../models/Bus/bus-stop.model';
import { PageBusStopDTO } from '../models/Pagination/busStopPage.model';

export interface BusStopListParams {
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
  city?: string;
}

export interface BusStopLookupParams {
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
}

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
      catchError(this.handleError)
    );
  }

  /**
   * GET /bus-stops/{id}
   * Get a specific bus stop by ID
   */
  getBusStopById(id: number): Observable<BusStopDto> {
    return this.http.get<BusStopDto>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
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

    return this.http.get<PageBusStopDTO>(this.apiUrl, { params: httpParams }).pipe(
      catchError(this.handleError)
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
      catchError(this.handleError)
    );
  }

  /**
   * PUT /bus-stops/{id}
   * Update a bus stop (Admin)
   */
  updateBusStop(id: number, payload: BusStopRequestDto): Observable<BusStopDto> {
    return this.http.put<BusStopDto>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * DELETE /bus-stops/{id}
   * Delete a bus stop (Admin)
   */
  deleteBusStop(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let message = 'Something went wrong';

    if (error.error instanceof ErrorEvent) {
      message = `Client Error: ${error.error.message}`;
    } else {
      message = `Server Error [${error.status}]: ${error.message}`;
    }

    console.error(message);
    return throwError(() => new Error(message));
  }
}
