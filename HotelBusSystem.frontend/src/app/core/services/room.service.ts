import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { RoomDTO, RoomRequestDTO } from '../models/Room/room.model';
import { PagedModelRoomDto, RoomListParams } from '../models/Pagination/roomPage.model';
import { handleError } from '../utils/ErrorHandling';

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
   * Get all rooms (paginated)
   */
  getAllRooms(params: RoomListParams = {}): Observable<PagedModelRoomDto> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);

    return this.http.get<any>(this.apiUrl, { params: httpParams }).pipe(
      map((res: any) => {
        const totalElements = res?.page?.totalElements ?? res?.totalElements ?? res?.content?.length ?? 0;
        const totalPages = res?.page?.totalPages ?? res?.totalPages ?? (totalElements > 0 ? 1 : 0);
        const size = res?.page?.size ?? res?.size ?? 10;
        const number = res?.page?.number ?? res?.number ?? 0;
        return {
          ...res,
          content: res?.content ?? [],
          totalElements,
          totalPages,
          size,
          number,
        } as PagedModelRoomDto;
      }),
      catchError(handleError)
    );
  }

  /**
   * Loads all rooms catalog by paginating up to 100 per page.
   * Used for client-side search and filtering across displayed fields.
   */
  getAllRoomsCatalog(): Observable<RoomDTO[]> {
    return this.getAllRooms({ page: 0, size: 100 }).pipe(
      switchMap((firstPage) => {
        const total = firstPage.totalElements ?? firstPage.page?.totalElements ?? 0;
        const firstBatch = firstPage.content ?? [];
        if (firstBatch.length >= total || firstPage.last) {
          return of(firstBatch);
        }

        const totalPages = Math.ceil(total / 100);
        const requests: Observable<PagedModelRoomDto>[] = [];
        for (let p = 1; p < totalPages; p++) {
          requests.push(this.getAllRooms({ page: p, size: 100 }));
        }

        return forkJoin(requests).pipe(
          map((pages) => [firstBatch, ...pages.map((pg) => pg.content ?? [])].flat())
        );
      }),
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
