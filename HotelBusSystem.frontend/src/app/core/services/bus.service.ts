import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BusDTO, BusRequestDTO } from '../models/Bus/bus.model';
import { PageBusDTO, BusListParams, BusLookupParams } from '../models/Pagination/busPage.model'
import { handleError } from '../utils/ErrorHandling';;



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
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    } else if (params.sortBy) {
      const dir = params.sortDirection || 'asc';
      httpParams = httpParams.set('sort', `${params.sortBy},${dir}`);
    }
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.busType) httpParams = httpParams.set('busType', params.busType);
    if (params.company) httpParams = httpParams.set('company', params.company);

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
        } as PageBusDTO;
      }),
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


}
