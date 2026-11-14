import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { HotelService } from './hotel.service';
import { environment } from '../../../environments/environment';
import { HotelDTO } from '../models/Hotel/hotel.model';
import { PageHotelDTO } from '../models/Pagination/hotelPage.model';

describe('HotelService', () => {
  let service: HotelService;
  let mockHttp: any;
  const baseUrl = `${environment.apiBaseUrl}/hotels`;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const injector = Injector.create({
      providers: [{ provide: HttpClient, useValue: mockHttp }],
    });

    service = runInInjectionContext(injector, () => new HotelService());
  });

  it('getHotels should pass query params correctly', () => {
    const mockPage: PageHotelDTO = {
      content: [{ id: 1, name: 'Hotel 1', city: 'Cairo', address: 'A', rating: 4.5, latitude: 30, longitude: 31, checkInTime: '14:00', checkOutTime: '11:00' }],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0,
    };
    mockHttp.get.mockReturnValue(of(mockPage));

    let res: any;
    service.getHotels({ page: 0, size: 10, q: 'test', city: 'Cairo', sort: 'name,asc' }).subscribe((data) => {
      res = data;
    });

    expect(res).toEqual(mockPage);
    expect(mockHttp.get).toHaveBeenCalledWith(baseUrl, expect.anything());

    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('10');
    expect(params.get('q')).toBe('test');
    expect(params.get('city')).toBe('Cairo');
    expect(params.get('sort')).toBe('name,asc');
  });

  it('getAllHotels should fetch page 0 and return when totalElements <= 100', () => {
    const mockHotels: HotelDTO[] = [
      { id: 1, name: 'H1', city: 'Cairo', address: 'A1', rating: 4, latitude: 30, longitude: 31, checkInTime: '14:00', checkOutTime: '11:00' },
      { id: 2, name: 'H2', city: 'Alexandria', address: 'A2', rating: 5, latitude: 31, longitude: 30, checkInTime: '14:00', checkOutTime: '11:00' },
    ];
    const mockPage: PageHotelDTO = {
      content: mockHotels,
      totalElements: 2,
      totalPages: 1,
      size: 100,
      number: 0,
    };
    mockHttp.get.mockReturnValue(of(mockPage));

    let result: HotelDTO[] = [];
    service.getAllHotels().subscribe((hotels) => {
      result = hotels;
    });

    expect(result).toEqual(mockHotels);
    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('100');
  });

  it('getAllHotels should fetch additional pages when totalElements > 100', () => {
    const page0Hotels = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Hotel ${i + 1}`,
      city: 'Cairo',
      address: 'Addr',
      rating: 4,
      latitude: 30,
      longitude: 31,
      checkInTime: '14:00',
      checkOutTime: '11:00',
    }));
    const page1Hotels = Array.from({ length: 25 }, (_, i) => ({
      id: 101 + i,
      name: `Hotel ${101 + i}`,
      city: 'Alexandria',
      address: 'Addr',
      rating: 4,
      latitude: 30,
      longitude: 31,
      checkInTime: '14:00',
      checkOutTime: '11:00',
    }));

    mockHttp.get.mockImplementation((url: string, options: { params: HttpParams }) => {
      const page = options.params.get('page');
      if (page === '0') {
        return of({
          content: page0Hotels,
          page: { totalElements: 125, totalPages: 2, size: 100, number: 0 },
        });
      } else {
        return of({
          content: page1Hotels,
          page: { totalElements: 125, totalPages: 2, size: 100, number: 1 },
        });
      }
    });

    let result: HotelDTO[] = [];
    service.getAllHotels().subscribe((hotels) => {
      result = hotels;
    });

    expect(result.length).toBe(125);
    expect(result[0].id).toBe(1);
    expect(result[124].id).toBe(125);
    expect(mockHttp.get).toHaveBeenCalledTimes(2);
  });
});

