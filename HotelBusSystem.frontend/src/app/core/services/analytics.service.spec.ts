import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { AnalyticsService } from './analytics.service';
import { environment } from '../../../environments/environment';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockHttp: any;
  const baseUrl = `${environment.apiBaseUrl}/admin/analytics`;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
    };

    const injector = Injector.create({
      providers: [{ provide: HttpClient, useValue: mockHttp }],
    });

    service = runInInjectionContext(injector, () => new AnalyticsService());
  });

  it('getSummary should send GET to /api/admin/analytics/summary with from and to when provided', () => {
    const mockData = { totalHotels: 5, totalRooms: 20, revenue: 15000 };
    mockHttp.get.mockReturnValue(of(mockData));

    let result: any;
    service.getSummary({ from: '2026-10-01', to: '2026-10-31' }).subscribe((res) => {
      result = res;
    });

    expect(result).toEqual(mockData);
    expect(mockHttp.get).toHaveBeenCalledWith(`${baseUrl}/summary`, expect.anything());

    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('from')).toBe('2026-10-01');
    expect(params.get('to')).toBe('2026-10-31');
  });

  it('getSummary should omit from and to when not provided (allowing backend default)', () => {
    mockHttp.get.mockReturnValue(of({}));

    service.getSummary().subscribe();

    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.has('from')).toBe(false);
    expect(params.has('to')).toBe(false);
  });

  it('getRevenueTrends should send GET to /revenue with required granularity', () => {
    const mockRes = { granularity: 'DAY', points: [] };
    mockHttp.get.mockReturnValue(of(mockRes));

    service.getRevenueTrends({ granularity: 'DAY', from: '2026-11-01', to: '2026-11-10' }).subscribe();

    expect(mockHttp.get).toHaveBeenCalledWith(`${baseUrl}/revenue`, expect.anything());
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('granularity')).toBe('DAY');
    expect(params.get('from')).toBe('2026-11-01');
    expect(params.get('to')).toBe('2026-11-10');
  });

  it('getBookingsTrends should send GET to /bookings with granularity, type, and status', () => {
    mockHttp.get.mockReturnValue(of({ granularity: 'WEEK', points: [] }));

    service
      .getBookingsTrends({
        granularity: 'WEEK',
        type: 'HOTEL',
        status: 'CONFIRMED',
      })
      .subscribe();

    expect(mockHttp.get).toHaveBeenCalledWith(`${baseUrl}/bookings`, expect.anything());
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('granularity')).toBe('WEEK');
    expect(params.get('type')).toBe('HOTEL');
    expect(params.get('status')).toBe('CONFIRMED');
  });

  it('getBookingsByStatus should send GET to /bookings/status', () => {
    mockHttp.get.mockReturnValue(of({ items: [] }));

    service.getBookingsByStatus({ type: 'BUS' }).subscribe();

    expect(mockHttp.get).toHaveBeenCalledWith(`${baseUrl}/bookings/status`, expect.anything());
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('type')).toBe('BUS');
  });

  it('getTopHotels should send GET to /hotels/top with limit and sortBy', () => {
    mockHttp.get.mockReturnValue(of({ items: [] }));

    service.getTopHotels({ limit: 5, sortBy: 'BOOKINGS' }).subscribe();

    expect(mockHttp.get).toHaveBeenCalledWith(`${baseUrl}/hotels/top`, expect.anything());
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('limit')).toBe('5');
    expect(params.get('sortBy')).toBe('BOOKINGS');
  });

  it('getOccupancy should send GET to /occupancy with hotelId', () => {
    mockHttp.get.mockReturnValue(of({ items: [] }));

    service.getOccupancy({ hotelId: 10 }).subscribe();

    expect(mockHttp.get).toHaveBeenCalledWith(`${baseUrl}/occupancy`, expect.anything());
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('hotelId')).toBe('10');
  });

  it('getBusTrips should send GET to /bus-trips with routeId and limit', () => {
    mockHttp.get.mockReturnValue(of({ items: [] }));

    service.getBusTrips({ routeId: 3, limit: 15 }).subscribe();

    expect(mockHttp.get).toHaveBeenCalledWith(`${baseUrl}/bus-trips`, expect.anything());
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('routeId')).toBe('3');
    expect(params.get('limit')).toBe('15');
  });

  it('getPayments should send GET to /payments', () => {
    mockHttp.get.mockReturnValue(of({ items: [] }));

    service.getPayments({ from: '2026-11-01', to: '2026-11-14' }).subscribe();

    expect(mockHttp.get).toHaveBeenCalledWith(`${baseUrl}/payments`, expect.anything());
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('from')).toBe('2026-11-01');
    expect(params.get('to')).toBe('2026-11-14');
  });
});

