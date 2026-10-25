import { HttpClient, HttpEvent, HttpHeaders, HttpEventType } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ImageUploadUrlRequest,
  ImageUploadUrlResponse,
  UploadProgressState,
  HotelImageDto,
  HotelImageRequest,
} from '../models/Image/hotel_image.model';
import { HotelImageService } from './hotel-image.service';
import { handleError } from '../../../utils/ErrorHandling';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImageUploadService {
  private readonly http = inject(HttpClient);
  private readonly hotelImageService = inject(HotelImageService);
  private readonly apiUrl = `${environment.apiBaseUrl}/images/upload-url`;

  /**
   * Validates client-side file requirements:
   * - Must be JPEG, PNG, or WebP.
   * - Must not exceed 5 MB.
   */
  validateFile(file: File): FileValidationResult {
    if (!file) {
      return { valid: false, error: 'No file selected for upload.' };
    }

    const normalizedType = file.type?.trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(normalizedType as any)) {
      return {
        valid: false,
        error: `Invalid image type "${file.type || 'unknown'}". Allowed formats: JPEG, PNG, WebP.`,
      };
    }

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 5 MB.`,
      };
    }

    return { valid: true };
  }

  /**
   * POST /api/images/upload-url
   * Requests a short-lived presigned PUT URL and upload headers from the backend. Admin only.
   */
  getUploadUrl(
    hotelId: number,
    roomType?: string | null,
    contentType: string = 'image/webp'
  ): Observable<ImageUploadUrlResponse> {
    const payload: ImageUploadUrlRequest = {
      hotelId,
      roomType: roomType ? roomType.trim().toUpperCase() : null,
      contentType: contentType.trim().toLowerCase(),
    };

    return this.http
      .post<ImageUploadUrlResponse>(this.apiUrl, payload)
      .pipe(catchError(handleError));
  }

  /**
   * Direct Cloudflare R2 / S3 upload using presigned PUT.
   * - Uses exact headers returned by the backend.
   * - Bypasses backend JWT/cookies (auth interceptor filters non-backend origins).
   * - Uses observe: 'events', reportProgress: true, and responseType: 'text'.
   */
  uploadToStorage(
    uploadUrl: string,
    file: File,
    requiredHeaders: Record<string, string>
  ): Observable<HttpEvent<string>> {
    let headers = new HttpHeaders();
    if (requiredHeaders) {
      for (const [key, value] of Object.entries(requiredHeaders)) {
        headers = headers.set(key, value);
      }
    }

    // Defensive: Ensure Content-Type is always sent if missing from requiredHeaders
    if (!headers.has('Content-Type') && file.type) {
      headers = headers.set('Content-Type', file.type);
    }

    return this.http.put(uploadUrl, file, {
      headers,
      reportProgress: true,
      observe: 'events',
      responseType: 'text',
    });
  }

  /**
   * Complete high-level upload workflow:
   * 1. Validates file (MIME type and size limit).
   * 2. Requests presigned upload URL from backend.
   * 3. Streams file directly to Cloudflare R2 via HTTP PUT with progress events.
   * 4. Registers public URL with backend (POST /api/hotels/{hotelId}/images) only after successful storage PUT.
   *
   * If metadata registration fails, does NOT automatically re-upload the file to storage.
   */
  uploadImage(
    hotelId: number,
    file: File,
    roomType?: string | null,
    sortOrder: number = 0
  ): Observable<UploadProgressState> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return of({
        step: 'error',
        progress: 0,
        error: validation.error,
      });
    }

    return new Observable<UploadProgressState>((subscriber) => {
      let activeSub: { unsubscribe: () => void } | null = null;
      subscriber.next({ step: 'requesting-url', progress: 5 });

      activeSub = this.getUploadUrl(hotelId, roomType, file.type).subscribe({
        next: (urlResponse) => {
          if (!urlResponse || !urlResponse.uploadUrl || !urlResponse.publicUrl) {
            const errorMsg = 'Backend responded without a valid uploadUrl or publicUrl.';
            subscriber.next({
              step: 'error',
              progress: 0,
              error: errorMsg,
            });
            subscriber.error(new Error(errorMsg));
            return;
          }

          const { uploadUrl, publicUrl, requiredHeaders } = urlResponse;
          subscriber.next({ step: 'uploading', progress: 10, publicUrl });

          activeSub = this.uploadToStorage(uploadUrl, file, requiredHeaders).subscribe({
            next: (event: HttpEvent<string>) => {
              if (event.type === HttpEventType.UploadProgress) {
                const total = event.total || file.size;
                const percent = total > 0 ? Math.round((event.loaded / total) * 80) : 0;
                subscriber.next({
                  step: 'uploading',
                  progress: Math.min(10 + percent, 90),
                  publicUrl,
                });
              } else if (event.type === HttpEventType.Response) {
                subscriber.next({ step: 'registering', progress: 95, publicUrl });

                const metadataPayload: HotelImageRequest = {
                  url: publicUrl,
                  roomType: roomType ? roomType.trim().toUpperCase() : null,
                  sortOrder,
                };

                activeSub = this.hotelImageService.addImage(hotelId, metadataPayload).subscribe({
                  next: (createdImage: HotelImageDto) => {
                    subscriber.next({
                      step: 'completed',
                      progress: 100,
                      publicUrl,
                      imageDto: createdImage,
                    });
                    subscriber.complete();
                  },
                  error: (metaErr) => {
                    const errorMsg =
                      metaErr?.message ||
                      'File was uploaded to storage, but registering metadata with backend failed.';
                    subscriber.next({
                      step: 'error',
                      progress: 95,
                      publicUrl,
                      error: errorMsg,
                    });
                    subscriber.error(metaErr);
                  },
                });
              }
            },
            error: (uploadErr) => {
              let errorMsg = uploadErr?.message || 'Failed to upload image directly to storage.';
              if (uploadErr?.status === 0) {
                errorMsg =
                  'Storage upload failed (Network/CORS error): The browser could not complete the request to Cloudflare R2. Please verify CORS policy on the target bucket.';
              }
              subscriber.next({
                step: 'error',
                progress: 0,
                publicUrl,
                error: errorMsg,
              });
              subscriber.error(uploadErr);
            },
          });
        },
        error: (urlErr) => {
          const errorMsg = urlErr?.message || 'Failed to generate upload URL.';
          subscriber.next({
            step: 'error',
            progress: 0,
            error: errorMsg,
          });
          subscriber.error(urlErr);
        },
      });

      return () => {
        if (activeSub) {
          activeSub.unsubscribe();
        }
      };
    });
  }
}
