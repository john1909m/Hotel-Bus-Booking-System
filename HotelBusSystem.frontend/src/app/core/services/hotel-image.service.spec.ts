import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { HotelImageService } from './hotel-image.service';
import { environment } from '../../../environments/environment';
import { HotelImageDto, HotelImageRequest } from '../models/Image/hotel_image.model';

describe('HotelImageService', () => {
  let service: HotelImageService;
  let mockHttp: any;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: HttpClient, useValue: mockHttp },
      ],
    });

    service = runInInjectionContext(injector, () => new HotelImageService());
  });

  it('should fetch images for a hotel without roomType filter', () => {
    const mockImages: HotelImageDto[] = [
      { id: 1, hotelId: 10, roomType: null, url: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/1.jpg', sortOrder: 0 },
    ];
    mockHttp.get.mockReturnValue(of(mockImages));

    let result: HotelImageDto[] | undefined;
    service.getImages(10).subscribe((res) => {
      result = res;
    });

    expect(result).toEqual(mockImages);
    expect(mockHttp.get).toHaveBeenCalledWith(
      `${environment.apiBaseUrl}/hotels/10/images`,
      expect.objectContaining({ params: expect.anything() })
    );
  });

  it('should fetch images for a hotel with roomType filter', () => {
    mockHttp.get.mockReturnValue(of([]));

    service.getImages(10, 'SUITE').subscribe();

    expect(mockHttp.get).toHaveBeenCalled();
    const callArgs = mockHttp.get.mock.calls[0];
    expect(callArgs[0]).toBe(`${environment.apiBaseUrl}/hotels/10/images`);
    expect(callArgs[1].params.get('roomType')).toBe('SUITE');
  });

  it('should add image metadata via POST', () => {
    const payload: HotelImageRequest = {
      url: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/new.jpg',
      roomType: 'DELUXE',
      sortOrder: 2,
    };
    const responseDto: HotelImageDto = {
      id: 5,
      hotelId: 10,
      roomType: 'DELUXE',
      url: payload.url,
      sortOrder: 2,
    };
    mockHttp.post.mockReturnValue(of(responseDto));

    let created: HotelImageDto | undefined;
    service.addImage(10, payload).subscribe((res) => {
      created = res;
    });

    expect(created).toEqual(responseDto);
    expect(mockHttp.post).toHaveBeenCalledWith(
      `${environment.apiBaseUrl}/hotels/10/images`,
      payload
    );
  });

  it('should update image metadata via PUT', () => {
    const payload: HotelImageRequest = {
      url: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/updated.jpg',
      sortOrder: 5,
    };
    const responseDto: HotelImageDto = {
      id: 7,
      hotelId: 10,
      roomType: null,
      url: payload.url,
      sortOrder: 5,
    };
    mockHttp.put.mockReturnValue(of(responseDto));

    let updated: HotelImageDto | undefined;
    service.updateImage(7, payload).subscribe((res) => {
      updated = res;
    });

    expect(updated).toEqual(responseDto);
    expect(mockHttp.put).toHaveBeenCalledWith(
      `${environment.apiBaseUrl}/hotel-images/7`,
      payload
    );
  });

  it('should delete image metadata via DELETE', () => {
    mockHttp.delete.mockReturnValue(of(null));

    service.deleteImage(7).subscribe();

    expect(mockHttp.delete).toHaveBeenCalledWith(
      `${environment.apiBaseUrl}/hotel-images/7`
    );
  });
});
