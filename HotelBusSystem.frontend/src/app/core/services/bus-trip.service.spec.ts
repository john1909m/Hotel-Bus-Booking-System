import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { BusTripService } from './bus-trip.service';
import { environment } from '../../../environments/environment';
import { BusTripDTO } from '../models/Bus/bus-trip.model';
import { PageBusTripDTO } from '../models/Pagination/busTripPage.model';

describe('BusTripService', () => {
  let service: BusTripService;
  let mockHttp: any;
  const baseUrl = `${environment.apiBaseUrl}/bus-trips`;

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

    service = runInInjectionContext(injector, () => new BusTripService());
  });

  it('getAllBusTrips should default status to "ANY" if status is not provided', () => {
    mockHttp.get.mockReturnValue(of({
      content: [{ id: 1, busId: 10, routeId: 20, status: 'SCHEDULED', price: 50 }],
      page: { totalElements: 1, totalPages: 1, size: 10, number: 0 }
    }));

    let res: PageBusTripDTO | undefined;
    service.getAllBusTrips({ page: 0, size: 10 }).subscribe(data => {
      res = data;
    });

    expect(mockHttp.get).toHaveBeenCalledWith(baseUrl, expect.anything());
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('status')).toBe('ANY');
    expect(res?.totalElements).toBe(1);
  });

  it('getAllBusTrips should map status ALL to "ANY" for Spring Boot JPQL query compatibility', () => {
    mockHttp.get.mockReturnValue(of({
      content: [],
      page: { totalElements: 0, totalPages: 0, size: 10, number: 0 }
    }));

    service.getAllBusTrips({ status: 'ALL' as any }).subscribe();

    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('status')).toBe('ANY');
  });

  it('getAllBusTrips should pass specific status when chosen', () => {
    mockHttp.get.mockReturnValue(of({
      content: [],
      page: { totalElements: 0, totalPages: 0, size: 10, number: 0 }
    }));

    service.getAllBusTrips({ status: 'COMPLETED' as any }).subscribe();

    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('status')).toBe('COMPLETED');
  });

  it('getAllBusTrips should normalize Spring Boot 3 PagedModel metadata', () => {
    const rawResponse = {
      content: [{ id: 1, price: 100 }],
      page: {
        totalElements: 50,
        totalPages: 5,
        size: 10,
        number: 0
      }
    };
    mockHttp.get.mockReturnValue(of(rawResponse));

    let res: PageBusTripDTO | undefined;
    service.getAllBusTrips().subscribe(data => {
      res = data;
    });

    expect(res?.totalElements).toBe(50);
    expect(res?.totalPages).toBe(5);
  });
});
