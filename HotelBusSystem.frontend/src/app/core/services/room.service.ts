import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { RoomDTO, RoomRequestDTO } from '../models/Room/room.model';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private readonly apiUrl = `${environment.apiBaseUrl}/rooms`;
  private readonly http = inject(HttpClient);

  /**
   * POST /rooms
   * Create a new room (Admin)
   */
  createRoom(payload: RoomRequestDTO): Observable<RoomDTO> {
    return this.http.post<RoomDTO>(this.apiUrl, payload).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * GET /rooms/{id}
   * Get room by ID
   */
  getRoomById(id: number): Observable<RoomDTO> {
    return this.http.get<RoomDTO>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * GET /rooms
   * Get all rooms
   */
  getAllRooms(): Observable<RoomDTO[]> {
    return this.http.get<RoomDTO[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * GET /rooms/hotel/{hotelId}
   * Get all rooms for a specific hotel
   */
  getRoomsByHotelId(hotelId: number): Observable<RoomDTO[]> {
    return this.http.get<RoomDTO[]>(`${this.apiUrl}/hotel/${hotelId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * PUT /rooms/{id}
   * Update a room (Admin)
   */
  updateRoom(id: number, payload: RoomRequestDTO): Observable<RoomDTO> {
    return this.http.put<RoomDTO>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * DELETE /rooms/{id}
   * Delete a room (Admin)
   */
  deleteRoom(id: number): Observable<void> {
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
