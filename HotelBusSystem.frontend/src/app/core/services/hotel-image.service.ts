import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HotelImageDto, HotelImageRequest } from '../models/Image/hotel_image.model';
import { handleError } from '../../../utils/ErrorHandling';

@Injectable({
  providedIn: 'root',
})
export class HotelImageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * GET /api/hotels/{hotelId}/images
   * Retrieves gallery images for the specified hotel, ordered by sortOrder then ID.
   * Optional roomType filter (e.g. 'SINGLE', 'DOUBLE', 'SUITE', 'DELUXE').
   * Public endpoint.
   */
  getImages(hotelId: number, roomType?: string | null): Observable<HotelImageDto[]> {
    let params = new HttpParams();
    if (roomType && roomType.trim()) {
      params = params.set('roomType', roomType.trim());
    }

    return this.http
      .get<HotelImageDto[]>(`${this.baseUrl}/hotels/${hotelId}/images`, { params })
      .pipe(catchError(handleError));
  }

  /**
   * POST /api/hotels/{hotelId}/images
   * Registers a gallery image for a hotel. Admin only.
   * If roomType is null/omitted, image is hotel-level (e.g. exterior/lobby).
   * URL must be HTTPS and host must belong to allowed hosts.
   */
  addImage(hotelId: number, payload: HotelImageRequest): Observable<HotelImageDto> {
    return this.http
      .post<HotelImageDto>(`${this.baseUrl}/hotels/${hotelId}/images`, payload)
      .pipe(catchError(handleError));
  }

  /**
   * PUT /api/hotel-images/{imageId}
   * Updates an existing hotel image URL, room type, and sort order. Admin only.
   */
  updateImage(imageId: number, payload: HotelImageRequest): Observable<HotelImageDto> {
    return this.http
      .put<HotelImageDto>(`${this.baseUrl}/hotel-images/${imageId}`, payload)
      .pipe(catchError(handleError));
  }

  /**
   * DELETE /api/hotel-images/{imageId}
   * Deletes a hotel image record. Admin only.
   */
  deleteImage(imageId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/hotel-images/${imageId}`)
      .pipe(catchError(handleError));
  }
}
