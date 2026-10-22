import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BusDTO, BusRequestDTO } from '../models/Bus/bus.model';
import { PageBusDTO, BusListParams, BusLookupParams } from '../models/Pagination/busPage.model'
import { handleError } from '../../../utils/ErrorHandling';;



@Injectable({
  providedIn: 'root',
})
export class BusService {
  private readonly apiUrl = `${environment.apiBaseUrl}/buses`;
  private readonly http = inject(HttpClient);

  /**
   * POST /buses
   * Create a new bus (Admin)
   */
  createBus(payload: BusRequestDTO): Observable<BusDTO> {
    return this.http.post<BusDTO>(this.apiUrl, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /buses/{id}
   * Get bus by ID
   */
  getBusById(id: number): Observable<BusDTO> {
    return this.http.get<BusDTO>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /buses
   * Get all buses paginated
   */
  getAllBuses(params: BusListParams = {}): Observable<PageBusDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);

    return this.http.get<PageBusDTO>(this.apiUrl, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /buses/lookup
   * Lookup buses for dropdowns / autocomplete
   */
  lookupBuses(params: BusLookupParams = {}): Observable<BusDTO[]> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);

    return this.http.get<BusDTO[]>(`${this.apiUrl}/lookup`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * PUT /buses/{id}
   * Update a bus (Admin)
   */
  updateBus(id: number, payload: BusRequestDTO): Observable<BusDTO> {
    return this.http.put<BusDTO>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * DELETE /buses/{id}
   * Delete a bus (Admin)
   */
  deleteBus(id: number): Observable<void> {
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
