import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BusFeatureDto, BusFeatureRequestDto } from '../models/Bus/bus-feature.model';
import { handleError } from '../utils/ErrorHandling';

@Injectable({
  providedIn: 'root',
})
export class BusFeaturesService {
  private readonly apiUrl = `${environment.apiBaseUrl}/bus-features`;
  private readonly http = inject(HttpClient);

  /**
   * GET /api/bus-features
   * Lists all configured onboard bus features and their surcharges. Public.
   */
  getAllFeatures(): Observable<BusFeatureDto[]> {
    return this.http.get<BusFeatureDto[]>(this.apiUrl).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /api/bus-features/{id}
   * Retrieves single bus feature by ID. Public.
   */
  getFeatureById(id: number): Observable<BusFeatureDto> {
    return this.http.get<BusFeatureDto>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * POST /api/bus-features
   * Creates a new onboard feature (Admin).
   */
  createFeature(payload: BusFeatureRequestDto): Observable<BusFeatureDto> {
    return this.http.post<BusFeatureDto>(this.apiUrl, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * PUT /api/bus-features/{id}
   * Updates an existing onboard feature and surcharge (Admin).
   */
  updateFeature(id: number, payload: BusFeatureRequestDto): Observable<BusFeatureDto> {
    return this.http.put<BusFeatureDto>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * DELETE /api/bus-features/{id}
   * Deletes a bus feature by ID (Admin).
   */
  deleteFeature(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }
}
