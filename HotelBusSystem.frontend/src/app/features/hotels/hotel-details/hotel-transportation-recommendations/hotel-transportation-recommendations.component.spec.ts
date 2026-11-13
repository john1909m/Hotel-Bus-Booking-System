import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { of } from 'rxjs';
import { HotelTransportationRecommendationsComponent } from './hotel-transportation-recommendations.component';
import { BusStopService } from '../../../../core/services/bus-stop.service';
import { BusRouteService } from '../../../../core/services/bus-route.service';
import { BusTripService } from '../../../../core/services/bus-trip.service';
import { BusService } from '../../../../core/services/bus.service';
import { BusSeatService } from '../../../../core/services/bus-seat.service';
import { BusBookingService } from '../../../../core/services/bus-booking.service';
import { HotelBusStopService } from '../../../../core/services/hotel-bus-stop.service';
import { AuthService } from '../../../../core/services/auth.service';
import { BookingStateService } from '../../../../core/services/booking-state.service';
import { Router } from '@angular/router';

describe('HotelTransportationRecommendationsComponent', () => {
  let component: HotelTransportationRecommendationsComponent;
  let mockBusStopService: any;
  let mockBusRouteService: any;
  let mockBusTripService: any;
  let mockBusService: any;
  let mockBusSeatService: any;
  let mockBusBookingService: any;
  let mockHotelBusStopService: any;
  let mockAuthService: any;
  let bookingStateService: BookingStateService;
  let mockRouter: any;

  const storageMap = new Map<string, string>();
  const mockSessionStorage = {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => storageMap.set(k, v),
    removeItem: (k: string) => storageMap.delete(k),
    clear: () => storageMap.clear(),
    get length() { return storageMap.size; },
    key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
  };

  Object.defineProperty(globalThis, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true,
    configurable: true,
  });

  const mockHotel = {
    id: 1,
    name: 'Nile Palace Resort',
    city: 'Luxor',
    address: 'Corniche El Nile',
    rating: 4.9,
    latitude: 25.687,
    longitude: 32.639,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    description: 'Resort',
  };

  const mockStops = [
    { id: 10, name: 'Cairo Tahrir Terminal', city: 'Cairo', address: 'Downtown', latitude: 30.04, longitude: 31.23 },
    { id: 20, name: 'Luxor Station Terminal', city: 'Luxor', address: 'Station St', latitude: 25.69, longitude: 32.64 },
    { id: 30, name: 'Alexandria Moharam Bek', city: 'Alexandria', address: 'Moharam Bek', latitude: 31.20, longitude: 29.91 },
  ];

  const mockRoutes = [
    { id: 100, name: 'Cairo - Luxor Direct', duration: 480, originStopId: 10, destinationStopId: 20 },
  ];

  const mockTrips = [
    // Trip 1: Arrives at 13:15 (45 minutes before 14:00 check-in) -> PREFERRED timing!
    {
      id: 501,
      departureTime: '2026-11-10T08:00:00',
      arrivalTime: '2026-11-10T13:15:00',
      price: 350,
      status: 'SCHEDULED',
      busId: 5,
      routeId: 100,
    },
    // Trip 2: Arrives at 10:00 (4 hours before check-in) -> ELIGIBLE early arrival!
    {
      id: 502,
      departureTime: '2026-11-10T04:00:00',
      arrivalTime: '2026-11-10T10:00:00',
      price: 300,
      status: 'SCHEDULED',
      busId: 5,
      routeId: 100,
    },
    // Trip 3: Arrives on 2026-11-11 (AFTER check-in date) -> MUST BE EXCLUDED!
    {
      id: 503,
      departureTime: '2026-11-10T20:00:00',
      arrivalTime: '2026-11-11T02:00:00',
      price: 350,
      status: 'SCHEDULED',
      busId: 5,
      routeId: 100,
    },
  ];

  beforeEach(() => {
    sessionStorage.clear();

    mockRouter = { navigate: vi.fn() };
    mockBusStopService = {
      getAllBusStops: vi.fn().mockImplementation((params) => {
        if (params?.city) {
          const filtered = mockStops.filter((s) => s.city.toLowerCase() === params.city.toLowerCase());
          return of({ content: filtered });
        }
        return of({ content: mockStops });
      }),
      getBusStopById: vi.fn().mockImplementation((id) => {
        const found = mockStops.find((s) => s.id === id);
        return of(found || null);
      }),
    };

    mockBusRouteService = {
      getAllBusRoutes: vi.fn().mockReturnValue(of({ content: mockRoutes })),
    };

    mockBusTripService = {
      getAllBusTrips: vi.fn().mockReturnValue(of({ content: mockTrips })),
    };

    mockBusService = {
      getBusById: vi.fn().mockReturnValue(of({
        id: 5,
        busNumber: 'BUS-100',
        company: 'SuperJet Luxury',
        capacity: 40,
        busType: 'DELUXE',
      })),
    };

    mockBusSeatService = {
      getBusSeatsByBusId: vi.fn().mockReturnValue(of([])),
    };

    mockBusBookingService = {
      getBusBookingsByBusTripId: vi.fn().mockReturnValue(of({
        content: [
          { id: 1, seatId: 10, status: 'CONFIRMED' },
          { id: 2, seatId: 11, status: 'CONFIRMED' },
        ],
      })),
    };

    mockHotelBusStopService = {
      getHotelBusStopsByHotelId: vi.fn().mockReturnValue(of([
        { id: 1, hotelId: 1, busStopId: 20, distance: 1.2 },
      ])),
    };

    mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    const injector = Injector.create({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: BusStopService, useValue: mockBusStopService },
        { provide: BusRouteService, useValue: mockBusRouteService },
        { provide: BusTripService, useValue: mockBusTripService },
        { provide: BusService, useValue: mockBusService },
        { provide: BusSeatService, useValue: mockBusSeatService },
        { provide: BusBookingService, useValue: mockBusBookingService },
        { provide: HotelBusStopService, useValue: mockHotelBusStopService },
        { provide: AuthService, useValue: mockAuthService },
        BookingStateService,
      ],
    });

    runInInjectionContext(injector, () => {
      bookingStateService = injector.get(BookingStateService);
      component = new HotelTransportationRecommendationsComponent();
      component.hotel = mockHotel;
      component.checkInDate = '2026-11-10';
      component.checkInTime = '14:00';
      component.guestsCount = 2;
    });
  });

  it('should load bus stop options dynamically without hardcoded data', async () => {
    await component.loadAllBusStops();

    expect(mockBusStopService.getAllBusStops).toHaveBeenCalledWith({ size: 100 });
    const options = component.busStopOptions();
    expect(options.length).toBe(3);
    expect(options[0].label).toContain('Alexandria');
    expect(options[1].label).toContain('Cairo');
  });

  it('should resolve hotel bus stop and distance via backend hotel-bus-stops association', async () => {
    await component.resolveHotelBusStop();

    expect(mockHotelBusStopService.getHotelBusStopsByHotelId).toHaveBeenCalledWith(1);
    expect(component.hotelBusStop()).toBeTruthy();
    expect(component.hotelBusStop()?.id).toBe(20);
    expect(component.hotelBusStop()?.name).toBe('Luxor Station Terminal');
    expect(component.hotelBusDistance()).toBe(1.2);
  });

  it('should only recommend trips arriving on check-in date without hardcoded times', async () => {
    await component.loadAllBusStops();
    await component.resolveHotelBusStop();

    component.selectedOriginStopId.set(10); // Cairo
    await component.fetchRecommendations();

    const results = component.recommendedTrips();
    // Out of 3 trips: Trip 3 arrives on 2026-11-11 (next day) -> MUST BE EXCLUDED!
    // Trip 1 (13:15) and Trip 2 (10:00) arrive on check-in date 2026-11-10 -> Eligible.
    expect(results.length).toBe(2);

    // Both arrive on check-in date before 23:30 -> Recommended
    expect(results.some((t) => t.id === 501)).toBe(true);
    expect(results.some((t) => t.id === 502)).toBe(true);
    expect(results[0].timingBadgeLabel).toBe('Recommended');
  });

  it('should calculate available seats from total bus capacity minus active bookings', async () => {
    await component.loadAllBusStops();
    await component.resolveHotelBusStop();

    component.selectedOriginStopId.set(10);
    await component.fetchRecommendations();

    const trip = component.recommendedTrips().find((t) => t.id === 501)!;
    expect(trip).toBeTruthy();
    // Capacity = 40, active bookings = 2 -> available = 38
    expect(trip.availableSeatsCount).toBe(38);
    expect(trip.bus?.company).toBe('SuperJet Luxury');
    expect(trip.price).toBe(350);
  });

  it('should confirm seats and update centralized BookingStateService', async () => {
    await component.loadAllBusStops();
    await component.resolveHotelBusStop();

    component.selectedOriginStopId.set(10);
    await component.fetchRecommendations();

    const trip = component.recommendedTrips().find((t) => t.id === 501)!;
    component.tripForSeatSelection.set(trip);

    // Confirm 2 seats
    component.onSeatsConfirmed([
      { id: 101, seatId: 101, seatNumber: '4A', seatType: 'STANDARD' },
      { id: 102, seatId: 102, seatNumber: '4B', seatType: 'STANDARD' },
    ]);

    expect(bookingStateService.hasTransportation()).toBe(true);
    expect(bookingStateService.selectedSeatsCount()).toBe(2);
    expect(bookingStateService.transportationPrice()).toBe(700); // 2 * 350
    expect(bookingStateService.transportationBooking()?.destinationStop?.name).toBe('Luxor Station Terminal');
  });

  it('should allow removing transportation without affecting hotel selection', () => {
    bookingStateService.setHotelSelection({
      hotel: mockHotel,
      selectedRooms: [{ id: 1, roomNumber: '101', roomType: 'DOUBLE', capacity: 2, pricePerNight: 1000, hotelId: 1, hotelName: 'Hotel' }],
      checkIn: '2026-11-10',
      checkOut: '2026-11-12',
      stayNights: 2,
      adultsCount: 2,
      children: [],
      totalHotelPrice: 2000,
    });

    component.tripForSeatSelection.set(mockTrips[0] as any);
    component.onSeatsConfirmed([
      { id: 101, seatId: 101, seatNumber: '4A', seatType: 'STANDARD' },
    ]);

    expect(bookingStateService.hasTransportation()).toBe(true);
    expect(bookingStateService.hasHotel()).toBe(true);

    // Remove transportation
    component.onRemoveTransportation();

    expect(bookingStateService.hasTransportation()).toBe(false);
    expect(bookingStateService.hasHotel()).toBe(true);
    expect(bookingStateService.hotelPrice()).toBe(2000);
  });
});
