import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { BusStopService } from './bus-stop.service';
import { environment } from '../../../environments/environment';
import { BusStopDto } from '../models/Bus/bus-stop.model';
import { PageBusStopDTO } from '../models/Pagination/busStopPage.model';

describe('BusStopService', () => {
  let service: BusStopService;
  let mockHttp: any;
  const baseUrl = `${environment.apiBaseUrl}/bus-stops`;

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

    service = runInInjectionContext(injector, () => new BusStopService());
  });

  it('getAllBusStops should pass query and filter parameters correctly', () => {
    mockHttp.get.mockReturnValue(of({
      content: [{ id: 1, name: 'Tahrir', city: 'Cairo', address: 'Tahrir Sq' }],
      page: { totalElements: 1, totalPages: 1, size: 10, number: 0 }
    }));

    let res: PageBusStopDTO | undefined;
    service.getAllBusStops({ page: 0, size: 10, q: 'tahrir', city: 'Cairo', sort: 'name,asc' }).subscribe(data => {
      res = data;
    });

    expect(mockHttp.get).toHaveBeenCalledWith(baseUrl, expect.anything());
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('10');
    expect(params.get('q')).toBe('tahrir');
    expect(params.get('city')).toBe('Cairo');
    expect(params.get('sort')).toBe('name,asc');
    expect(res?.totalElements).toBe(1);
  });

  it('getAllBusStops should normalize Spring Boot 3 page metadata', () => {
    const rawResponse = {
      content: [{ id: 1, name: 'Ramses', city: 'Cairo' }],
      page: {
        totalElements: 15,
        totalPages: 2,
        size: 10,
        number: 0
      }
    };
    mockHttp.get.mockReturnValue(of(rawResponse));

    let res: PageBusStopDTO | undefined;
    service.getAllBusStops().subscribe(data => {
      res = data;
    });

    expect(res?.totalElements).toBe(15);
    expect(res?.totalPages).toBe(2);
  });

  it('getAllBusStopsCatalog should fetch all pages up to totalElements', () => {
    const page0 = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Stop ${i + 1}`, city: 'Cairo' }));
    const page1 = Array.from({ length: 10 }, (_, i) => ({ id: 101 + i, name: `Stop ${101 + i}`, city: 'Alex' }));

    mockHttp.get.mockImplementation((url: string, options: { params: HttpParams }) => {
      const page = options.params.get('page');
      if (page === '0') {
        return of({
          content: page0,
          page: { totalElements: 110, totalPages: 2, size: 100, number: 0 }
        });
      } else {
        return of({
          content: page1,
          page: { totalElements: 110, totalPages: 2, size: 100, number: 1 }
        });
      }
    });

    let result: BusStopDto[] = [];
    service.getAllBusStopsCatalog().subscribe(stops => {
      result = stops;
    });

    expect(result.length).toBe(110);
    expect(mockHttp.get).toHaveBeenCalledTimes(2);
  });
});

