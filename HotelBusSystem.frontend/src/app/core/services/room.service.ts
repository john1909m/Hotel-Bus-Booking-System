import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { RoomDTO, RoomRequestDTO } from '../models/Room/room.model';
import { PagedModelRoomDto, RoomListParams } from '../models/Pagination/roomPage.model';
import { handleError } from '../../../utils/ErrorHandling';

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
      catchError(handleError)
    );
  }

  /**
   * GET /rooms/{id}
   * Get room by ID
   */
  getRoomById(id: number): Observable<RoomDTO> {
    return this.http.get<RoomDTO>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /rooms
   * Get all rooms (unpaginated list)
   */
  getAllRooms(): Observable<RoomDTO[]> {
    return this.http.get<RoomDTO[]>(this.apiUrl).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /rooms/hotel/{hotelId}
   * Get all rooms for a specific hotel (unpaginated list)
   */
  getRoomsByHotelId(hotelId: number): Observable<RoomDTO[]> {
    return this.http.get<RoomDTO[]>(`${this.apiUrl}/hotel/${hotelId}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /hotels/{hotelId}/rooms
   * Get paginated rooms for a specific hotel returning PagedRoomModelDto (PagedModel<RoomDto>)
   */
  getPaginatedRoomsByHotelId(
    hotelId: number,
    params: RoomListParams = {}
  ): Observable<PagedModelRoomDto> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);

    return this.http
      .get<PagedModelRoomDto>(`${environment.apiBaseUrl}/hotels/${hotelId}/rooms`, {
        params: httpParams,
      })
      .pipe(catchError(handleError));
  }

  /**
   * PUT /rooms/{id}
   * Update a room (Admin)
   */
  updateRoom(id: number, payload: RoomRequestDTO): Observable<RoomDTO> {
    return this.http.put<RoomDTO>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * DELETE /rooms/{id}
   * Delete a room (Admin)
   */
  deleteRoom(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }
}
