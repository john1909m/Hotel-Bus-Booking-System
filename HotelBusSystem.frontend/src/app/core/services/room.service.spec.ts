import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { RoomService } from './room.service';
import { environment } from '../../../environments/environment';
import { RoomDTO } from '../models/Room/room.model';
import { PagedModelRoomDto } from '../models/Pagination/roomPage.model';

describe('RoomService', () => {
  let service: RoomService;
  let mockHttp: any;
  const baseUrl = `${environment.apiBaseUrl}/rooms`;

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

    service = runInInjectionContext(injector, () => new RoomService());
  });

  it('getAllRooms should pass pagination and sort parameters correctly', () => {
    mockHttp.get.mockReturnValue(of({
      content: [
        { id: 1, roomNumber: '101', roomType: 'SINGLE', capacity: 1, pricePerNight: 100, hotelId: 1, hotelName: 'Grand Hotel' }
      ],
      page: { totalElements: 1, totalPages: 1, size: 10, number: 0 }
    }));

    let res: PagedModelRoomDto | undefined;
    service.getAllRooms({ page: 0, size: 10, sort: 'id,asc' }).subscribe(data => {
      res = data;
    });

    expect(mockHttp.get).toHaveBeenCalledWith(baseUrl, expect.anything());
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('10');
    expect(params.get('sort')).toBe('id,asc');
    expect(res?.totalElements).toBe(1);
    expect(res?.content[0].hotelName).toBe('Grand Hotel');
  });

  it('getAllRooms should normalize Spring Boot 3 PagedModel page metadata', () => {
    const rawResponse = {
      content: [
        { id: 1, roomNumber: '101', roomType: 'SINGLE', capacity: 1, pricePerNight: 100, hotelId: 1, hotelName: 'Hotel A' },
        { id: 2, roomNumber: '102', roomType: 'DOUBLE', capacity: 2, pricePerNight: 150, hotelId: 1, hotelName: 'Hotel A' }
      ],
      page: {
        totalElements: 50,
        totalPages: 5,
        size: 10,
        number: 0
      }
    };
    mockHttp.get.mockReturnValue(of(rawResponse));

    let res: PagedModelRoomDto | undefined;
    service.getAllRooms().subscribe(data => {
      res = data;
    });

    expect(res?.totalElements).toBe(50);
    expect(res?.totalPages).toBe(5);
    expect(res?.size).toBe(10);
    expect(res?.number).toBe(0);
    expect(res?.content.length).toBe(2);
  });

  it('getAllRoomsCatalog should fetch all pages up to totalElements', () => {
    const page0 = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      roomNumber: `Room ${i + 1}`,
      roomType: 'SINGLE' as const,
      capacity: 1,
      pricePerNight: 100,
      hotelId: 1,
      hotelName: 'Grand Hotel'
    }));
    const page1 = Array.from({ length: 20 }, (_, i) => ({
      id: 101 + i,
      roomNumber: `Room ${101 + i}`,
      roomType: 'DOUBLE' as const,
      capacity: 2,
      pricePerNight: 150,
      hotelId: 1,
      hotelName: 'Grand Hotel'
    }));

    mockHttp.get.mockImplementation((url: string, options: { params: HttpParams }) => {
      const page = options.params.get('page');
      if (page === '0') {
        return of({
          content: page0,
          page: { totalElements: 120, totalPages: 2, size: 100, number: 0 }
        });
      } else {
        return of({
          content: page1,
          page: { totalElements: 120, totalPages: 2, size: 100, number: 1 }
        });
      }
    });

    let result: RoomDTO[] = [];
    service.getAllRoomsCatalog().subscribe(rooms => {
      result = rooms;
    });

    expect(result.length).toBe(120);
    expect(mockHttp.get).toHaveBeenCalledTimes(2);
  });
});

