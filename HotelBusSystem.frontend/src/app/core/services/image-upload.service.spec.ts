import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { ImageUploadService, MAX_IMAGE_FILE_SIZE_BYTES } from './image-upload.service';
import { HotelImageService } from './hotel-image.service';
import { environment } from '../../../environments/environment';
import { ImageUploadUrlResponse, HotelImageDto } from '../models/Image/hotel_image.model';

describe('ImageUploadService', () => {
  let service: ImageUploadService;
  let mockHttp: any;
  let mockHotelImageService: any;

  beforeEach(() => {
    mockHttp = {
      post: vi.fn(),
      put: vi.fn(),
    };
    mockHotelImageService = {
      addImage: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: HttpClient, useValue: mockHttp },
        { provide: HotelImageService, useValue: mockHotelImageService },
      ],
    });

    service = runInInjectionContext(injector, () => new ImageUploadService());
  });

  describe('validateFile', () => {
    it('should validate valid JPEG, PNG, and WebP files under 5MB', () => {
      const validJpeg = new File(['dummy-bytes'], 'test.jpg', { type: 'image/jpeg' });
      const validPng = new File(['dummy-bytes'], 'test.png', { type: 'image/png' });
      const validWebp = new File(['dummy-bytes'], 'test.webp', { type: 'image/webp' });

      expect(service.validateFile(validJpeg).valid).toBe(true);
      expect(service.validateFile(validPng).valid).toBe(true);
      expect(service.validateFile(validWebp).valid).toBe(true);
    });

    it('should reject unsupported MIME types', () => {
      const gif = new File(['dummy-bytes'], 'test.gif', { type: 'image/gif' });
      const pdf = new File(['dummy-bytes'], 'test.pdf', { type: 'application/pdf' });

      const resGif = service.validateFile(gif);
      expect(resGif.valid).toBe(false);
      expect(resGif.error).toContain('Invalid image type');

      const resPdf = service.validateFile(pdf);
      expect(resPdf.valid).toBe(false);
    });

    it('should reject files exceeding 5MB', () => {
      const largeFile = new File([''], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: MAX_IMAGE_FILE_SIZE_BYTES + 1024 });

      const res = service.validateFile(largeFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds maximum allowed limit of 5 MB');
    });

    it('should handle null/empty files gracefully', () => {
      const res = service.validateFile(null as any);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('No file selected for upload.');
    });
  });

  describe('getUploadUrl', () => {
    it('should request presigned URL with correct payload', () => {
      const mockResponse: ImageUploadUrlResponse = {
        uploadUrl: 'https://r2.storage/upload?sig=123',
        publicUrl: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/deluxe/pic.webp',
        expiresInSeconds: 300,
        method: 'PUT',
        requiredHeaders: { 'Content-Type': 'image/webp' },
      };
      mockHttp.post.mockReturnValue(of(mockResponse));

      let result: ImageUploadUrlResponse | undefined;
      service.getUploadUrl(1, 'DELUXE', 'image/webp').subscribe((res) => {
        result = res;
      });

      expect(result).toEqual(mockResponse);
      expect(mockHttp.post).toHaveBeenCalledWith(
        `${environment.apiBaseUrl}/images/upload-url`,
        {
          hotelId: 1,
          roomType: 'DELUXE',
          contentType: 'image/webp',
        }
      );
    });
  });

  describe('uploadToStorage', () => {
    it('should issue PUT request with requiredHeaders and responseType text', () => {
      const file = new File(['image-bits'], 'room.webp', { type: 'image/webp' });
      const uploadUrl = 'https://r2.storage/upload?sig=abc';
      mockHttp.put.mockReturnValue(of(new HttpResponse({ status: 200, body: '' })));

      service.uploadToStorage(uploadUrl, file, { 'Content-Type': 'image/webp' }).subscribe();

      expect(mockHttp.put).toHaveBeenCalledWith(
        uploadUrl,
        file,
        expect.objectContaining({
          reportProgress: true,
          observe: 'events',
          responseType: 'text',
        })
      );
    });
  });

  describe('uploadImage complete workflow', () => {
    it('should coordinate presigned URL -> R2 PUT -> metadata registration', () => {
      const file = new File(['valid-image-content'], 'lobby.jpg', { type: 'image/jpeg' });
      const mockUploadResponse: ImageUploadUrlResponse = {
        uploadUrl: 'https://r2.storage/upload-url',
        publicUrl: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/gallery/lobby.jpg',
        expiresInSeconds: 300,
        requiredHeaders: { 'Content-Type': 'image/jpeg' },
      };
      const mockCreatedDto: HotelImageDto = {
        id: 99,
        hotelId: 1,
        roomType: null,
        url: mockUploadResponse.publicUrl,
        sortOrder: 0,
      };

      mockHttp.post.mockReturnValue(of(mockUploadResponse));
      mockHttp.put.mockReturnValue(of(new HttpResponse({ status: 200, body: '' })));
      mockHotelImageService.addImage.mockReturnValue(of(mockCreatedDto));

      const emittedSteps: string[] = [];
      let finalState: any = null;

      service.uploadImage(1, file, null, 0).subscribe({
        next: (state) => {
          emittedSteps.push(state.step);
          finalState = state;
        },
      });

      expect(emittedSteps).toContain('requesting-url');
      expect(emittedSteps).toContain('uploading');
      expect(emittedSteps).toContain('registering');
      expect(emittedSteps).toContain('completed');

      expect(finalState.step).toBe('completed');
      expect(finalState.progress).toBe(100);
      expect(finalState.publicUrl).toBe(mockUploadResponse.publicUrl);
      expect(finalState.imageDto).toEqual(mockCreatedDto);

      // Verify metadata registration was called with the returned publicUrl
      expect(mockHotelImageService.addImage).toHaveBeenCalledWith(1, {
        url: mockUploadResponse.publicUrl,
        roomType: null,
        sortOrder: 0,
      });
    });

    it('should set fallback Content-Type when requiredHeaders does not provide it', () => {
      const file = new File(['bits'], 'room.png', { type: 'image/png' });
      const uploadUrl = 'https://r2.storage/upload-url';
      mockHttp.put.mockReturnValue(of(new HttpResponse({ status: 200, body: '' })));

      service.uploadToStorage(uploadUrl, file, {}).subscribe();

      expect(mockHttp.put).toHaveBeenCalledWith(
        uploadUrl,
        file,
        expect.objectContaining({
          headers: expect.anything(),
        })
      );
      const callArgs = mockHttp.put.mock.calls[0];
      const sentHeaders = callArgs[2].headers;
      expect(sentHeaders.get('Content-Type')).toBe('image/png');
    });

    it('should emit error when backend returns missing uploadUrl or publicUrl', () => {
      const file = new File(['bits'], 'room.webp', { type: 'image/webp' });
      mockHttp.post.mockReturnValue(of({ uploadUrl: '', publicUrl: '' }));

      let errorState: any = null;
      service.uploadImage(1, file, null, 0).subscribe({
        next: (state) => {
          if (state.step === 'error') errorState = state;
        },
        error: () => {},
      });

      expect(errorState).toBeTruthy();
      expect(errorState.step).toBe('error');
      expect(errorState.error).toContain('Backend responded without a valid uploadUrl');
    });

    it('should format informative error message when storage PUT fails with status 0 (Network/CORS)', () => {
      const file = new File(['bits'], 'room.webp', { type: 'image/webp' });
      const mockUploadResponse: ImageUploadUrlResponse = {
        uploadUrl: 'https://r2.storage/upload-url',
        publicUrl: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/pic.webp',
        expiresInSeconds: 300,
        requiredHeaders: { 'Content-Type': 'image/webp' },
      };

      const networkCorsError = {
        status: 0,
        statusText: undefined,
        message: 'Http failure response for https://r2.storage/upload-url: 0 undefined',
      };

      mockHttp.post.mockReturnValue(of(mockUploadResponse));
      mockHttp.put.mockReturnValue(new Observable((sub) => sub.error(networkCorsError)));

      let errorState: any = null;
      service.uploadImage(1, file, null, 0).subscribe({
        next: (state) => {
          if (state.step === 'error') errorState = state;
        },
        error: () => {},
      });

      expect(errorState).toBeTruthy();
      expect(errorState.step).toBe('error');
      expect(errorState.error).toContain('Network/CORS error');
      expect(errorState.error).toContain('Cloudflare R2');
    });
  });
});
