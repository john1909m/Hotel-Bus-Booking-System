import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { HotelBookingService } from './hotel-booking.service';
import { HotelBookingRequestDTO, HotelBookingDTO } from '../models/Hotel/hotel-booking.model';

describe('HotelBookingService - Guest Breakdown Persistence & Enrichment', () => {
  let service: HotelBookingService;
  let mockHttpClient: any;
  let storageStore: Record<string, string> = {};

  beforeEach(() => {
    storageStore = {};
    const mockLocalStorage = {
      getItem: (key: string) => storageStore[key] || null,
      setItem: (key: string, val: string) => {
        storageStore[key] = val;
      },
      removeItem: (key: string) => {
        delete storageStore[key];
      },
      clear: () => {
        storageStore = {};
      },
    };
    vi.stubGlobal('localStorage', mockLocalStorage);

    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: HttpClient, useValue: mockHttpClient },
        HotelBookingService,
      ],
    });

    service = runInInjectionContext(injector, () => injector.get(HotelBookingService));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves and retrieves guest breakdown from localStorage', () => {
    service.saveGuestBreakdown(101, { adults: 2, childAges: [14, 5] });

    const retrieved = service.getSavedGuestBreakdown(101);
    expect(retrieved).toEqual({ adults: 2, childAges: [14, 5] });
  });

  it('enriches a booking when backend entity omits childAges or collapses adults into guests', () => {
    service.saveGuestBreakdown(202, { adults: 2, childAges: [12] });

    const rawBackendDto: HotelBookingDTO = {
      id: 202,
      checkIn: '2026-12-01',
      checkOut: '2026-12-05',
      guests: 3,
      status: 'CONFIRMED',
      totalPrice: 4500,
      userId: 1,
      roomId: 10,
      hotelId: 5,
      hotelName: 'Seaside Hotel',
    };

    const enriched = service.enrichBookingWithBreakdown(rawBackendDto);
    expect(enriched.adults).toBe(2);
    expect(enriched.childAges).toEqual([12]);
    expect(enriched.guests).toBe(3);
  });

  it('createHotelBooking intercepts response and persists guest breakdown', () => {
    const payload: HotelBookingRequestDTO = {
      checkIn: '2026-12-10',
      checkOut: '2026-12-15',
      guests: 3,
      adults: 2,
      childAges: [7],
      roomId: 101,
      roomIds: [101],
    };

    const mockResponse: HotelBookingDTO = {
      id: 303,
      checkIn: '2026-12-10',
      checkOut: '2026-12-15',
      guests: 3,
      adults: 3, // Backend mapper fallback
      childAges: [],
      status: 'PENDING',
      totalPrice: 5000,
      userId: 1,
      roomId: 101,
      hotelId: 10,
      hotelName: 'Grand Resort',
    };

    mockHttpClient.post.mockReturnValue(of(mockResponse));

    let result: HotelBookingDTO | undefined;
    service.createHotelBooking(payload).subscribe((res) => {
      result = res;
    });

    expect(mockHttpClient.post).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result?.adults).toBe(2);
    expect(result?.childAges).toEqual([7]);
    expect(service.getSavedGuestBreakdown(303)).toEqual({ adults: 2, childAges: [7] });
  });

  it('getMyHotelBookings enriches all user bookings with stored breakdowns', () => {
    service.saveGuestBreakdown(401, { adults: 2, childAges: [14, 5] });

    const mockList: HotelBookingDTO[] = [
      {
        id: 401,
        checkIn: '2026-12-01',
        checkOut: '2026-12-05',
        guests: 4,
        status: 'CONFIRMED',
        totalPrice: 6000,
        userId: 1,
        roomId: 1,
        hotelId: 1,
        hotelName: 'Nile Resort',
      },
      {
        id: 402,
        checkIn: '2026-12-06',
        checkOut: '2026-12-08',
        guests: 1,
        status: 'CONFIRMED',
        totalPrice: 2000,
        userId: 1,
        roomId: 2,
        hotelId: 1,
        hotelName: 'Nile Resort',
      },
    ];

    mockHttpClient.get.mockReturnValue(of(mockList));

    let resultList: HotelBookingDTO[] = [];
    service.getMyHotelBookings().subscribe((list) => {
      resultList = list;
    });

    expect(mockHttpClient.get).toHaveBeenCalled();
    expect(resultList.length).toBe(2);
    expect(resultList[0].adults).toBe(2);
    expect(resultList[0].childAges).toEqual([14, 5]);
  });
});
