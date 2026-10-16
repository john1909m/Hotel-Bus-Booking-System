import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BusSeatDTO, BusSeatRequestDTO } from '../models/Bus/bus-seat.model';

@Injectable({
  providedIn: 'root',
})
export class BusSeatService {
  private readonly apiUrl = `${environment.apiBaseUrl}/bus-seats`;
  private readonly http = inject(HttpClient);

  /**
   * POST /bus-seats
   * Create a new bus seat (Admin)
   */
  createBusSeat(payload: BusSeatRequestDTO): Observable<BusSeatDTO> {
    return this.http.post<BusSeatDTO>(this.apiUrl, payload).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * GET /bus-seats/{id}
   * Get bus seat by ID
   */
  getBusSeatById(id: number): Observable<BusSeatDTO> {
    return this.http.get<BusSeatDTO>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * GET /bus-seats
   * Get all bus seats
   */
  getAllBusSeats(): Observable<BusSeatDTO[]> {
    return this.http.get<BusSeatDTO[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * GET /bus-seats/bus/{busId}
   * Get all seats for a specific bus
   */
  getBusSeatsByBusId(busId: number): Observable<BusSeatDTO[]> {
    return this.http.get<BusSeatDTO[]>(`${this.apiUrl}/bus/${busId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * PUT /bus-seats/{id}
   * Update a bus seat (Admin)
   */
  updateBusSeat(id: number, payload: BusSeatRequestDTO): Observable<BusSeatDTO> {
    return this.http.put<BusSeatDTO>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * DELETE /bus-seats/{id}
   * Delete a bus seat (Admin)
   */
  deleteBusSeat(id: number): Observable<void> {
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
