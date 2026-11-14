import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { BusService } from './bus.service';
import { environment } from '../../../environments/environment';
import { BusDTO } from '../models/Bus/bus.model';
import { PageBusDTO } from '../models/Pagination/busPage.model';

describe('BusService', () => {
  let service: BusService;
  let mockHttp: any;
  const baseUrl = `${environment.apiBaseUrl}/buses`;

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

    service = runInInjectionContext(injector, () => new BusService());
  });

  it('getAllBuses should pass pagination, search, and filter params correctly', () => {
    mockHttp.get.mockReturnValue(of({
      content: [{ id: 1, busNumber: 'BUS-101', company: 'GoBus', busType: 'DELUXE', capacity: 40 }],
      page: { totalElements: 1, totalPages: 1, size: 10, number: 0 }
    }));

    let res: PageBusDTO | undefined;
    service.getAllBuses({
      page: 1,
      size: 20,
      q: '101',
      busType: 'DELUXE',
      company: 'GoBus',
      sort: 'busNumber,asc'
    }).subscribe(data => {
      res = data;
    });

    expect(mockHttp.get).toHaveBeenCalledWith(baseUrl, expect.anything());
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('page')).toBe('1');
    expect(params.get('size')).toBe('20');
    expect(params.get('q')).toBe('101');
    expect(params.get('busType')).toBe('DELUXE');
    expect(params.get('company')).toBe('GoBus');
    expect(params.get('sort')).toBe('busNumber,asc');
    expect(res?.totalElements).toBe(1);
  });

  it('getAllBuses should format sortBy and sortDirection into Spring sort parameter', () => {
    mockHttp.get.mockReturnValue(of({
      content: [],
      page: { totalElements: 0, totalPages: 0, size: 10, number: 0 }
    }));

    service.getAllBuses({ sortBy: 'company', sortDirection: 'desc' }).subscribe();

    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('sort')).toBe('company,desc');
  });

  it('getAllBuses should normalize Spring Boot 3 PagedModel response', () => {
    const rawResponse = {
      content: [{ id: 1, busNumber: 'BUS-01' }],
      page: {
        totalElements: 25,
        totalPages: 3,
        size: 10,
        number: 0
      }
    };
    mockHttp.get.mockReturnValue(of(rawResponse));

    let res: PageBusDTO | undefined;
    service.getAllBuses().subscribe(data => {
      res = data;
    });

    expect(res?.totalElements).toBe(25);
    expect(res?.totalPages).toBe(3);
    expect(res?.size).toBe(10);
    expect(res?.number).toBe(0);
  });
});
