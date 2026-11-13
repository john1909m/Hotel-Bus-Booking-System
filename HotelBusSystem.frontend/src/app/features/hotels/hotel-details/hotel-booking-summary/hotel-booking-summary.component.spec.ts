import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { HotelBookingSummaryComponent } from './hotel-booking-summary.component';
import { BookingStateService } from '../../../../core/services/booking-state.service';
import { BusStopService } from '../../../../core/services/bus-stop.service';
import { BusRouteService } from '../../../../core/services/bus-route.service';
import { BusTripService } from '../../../../core/services/bus-trip.service';
import { BusService } from '../../../../core/services/bus.service';
import { BusBookingService } from '../../../../core/services/bus-booking.service';
import { HotelBusStopService } from '../../../../core/services/hotel-bus-stop.service';
import { AuthService } from '../../../../core/services/auth.service';

describe('HotelBookingSummaryComponent - Date Picker & Bus Suggestions', () => {
  let component: HotelBookingSummaryComponent;
  let bookingState: BookingStateService;
  let mockRouter: any;
  let mockBusStopService: any;
  let mockBusRouteService: any;
  let mockBusTripService: any;
  let mockBusService: any;
  let mockBusBookingService: any;
  let mockHotelBusStopService: any;
  let mockAuthService: any;

  const mockHotel = {
    id: 1,
    name: 'Steigenberger Resort',
    city: 'Hurghada',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    latitude: 27.25,
    longitude: 33.81,
  };

  const mockStops = [
    { id: 10, name: 'Cairo Gateway Terminal', city: 'Cairo', latitude: 30.04, longitude: 31.23 },
    { id: 20, name: 'Hurghada Central Station', city: 'Hurghada', latitude: 27.24, longitude: 33.82 },
  ];

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    mockRouter = {
      navigate: vi.fn(),
      url: '/hotels/1',
    };

    mockBusStopService = {
      getAllBusStops: vi.fn().mockReturnValue(of({ content: mockStops })),
      getBusStopById: vi.fn().mockImplementation((id: number) => of(mockStops.find((s) => s.id === id) || null)),
    };

    mockBusRouteService = {
      getAllBusRoutes: vi.fn().mockReturnValue(of({
        content: [
          { id: 1, originStopId: 10, destinationStopId: 20 },
          { id: 2, originStopId: 20, destinationStopId: 10 },
        ],
      })),
    };

    mockBusTripService = {
      getAllBusTrips: vi.fn().mockImplementation((params: any) => {
        if (params?.routeId === 1) {
          // Outgoing trips: Cairo -> Hurghada
          return of({
            content: [
              {
                id: 101,
                routeId: 1,
                busId: 5,
                departureTime: '2026-11-05T07:00:00',
                arrivalTime: '2026-11-05T13:00:00', // 1 hr before 14:00 check-in!
                price: 350,
                status: 'SCHEDULED',
              },
            ],
          });
        }
        if (params?.routeId === 2) {
          // Return trips: Hurghada -> Cairo
          return of({
            content: [
              {
                id: 201,
                routeId: 2,
                busId: 5,
                departureTime: '2026-11-08T13:00:00', // After 11:00 check-out!
                arrivalTime: '2026-11-08T19:00:00',
                price: 350,
                status: 'SCHEDULED',
              },
            ],
          });
        }
        return of({ content: [] });
      }),
    };

    mockBusService = {
      getBusById: vi.fn().mockReturnValue(of({ id: 5, company: 'Go Bus Egypt', capacity: 40 })),
    };

    mockBusBookingService = {
      getBookingsByTripId: vi.fn().mockReturnValue(of([])), // 0 booked, full capacity available
    };

    mockHotelBusStopService = {
      getHotelBusStopsByHotelId: vi.fn().mockReturnValue(of([
        { hotelId: 1, busStopId: 20, distance: 1.5 },
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
        { provide: BusBookingService, useValue: mockBusBookingService },
        { provide: HotelBusStopService, useValue: mockHotelBusStopService },
        { provide: AuthService, useValue: mockAuthService },
        BookingStateService,
        HotelBookingSummaryComponent,
      ],
    });

    bookingState = injector.get(BookingStateService);

    // Populate booking state with initial hotel selection
    bookingState.hotelBooking.set({
      hotel: mockHotel as any,
      selectedRooms: [{ id: 101, roomNumber: '101', roomType: 'DELUXE', capacity: 2, pricePerNight: 1200 } as any],
      checkIn: '2026-11-05',
      checkOut: '2026-11-08',
      stayNights: 3,
      adultsCount: 2,
      children: [],
      totalHotelPrice: 3600,
    });

    component = runInInjectionContext(injector, () => new HotelBookingSummaryComponent());
  });

  it('clicking Change dates toggles inline date editor without navigating or closing drawer', () => {
    bookingState.openSummary();
    expect(bookingState.summaryOpen()).toBe(true);
    expect(component.isEditingDates()).toBe(false);

    // Call onChangeDates
    component.onChangeDates();

    // Must stay open and not navigate!
    expect(component.isEditingDates()).toBe(true);
    expect(bookingState.summaryOpen()).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('valid inline date changes update BookingStateService and recalculate nights and price', () => {
    component.openDateEditor();

    // Change to 5 nights: 2026-11-10 to 2026-11-15
    const newIn = new Date(2026, 10, 10);
    const newOut = new Date(2026, 10, 15);

    component.onCheckInSelect(newIn);
    component.onCheckOutSelect(newOut);

    expect(component.dateErrorMessage()).toBeNull();
    const updated = bookingState.hotelBooking();
    expect(updated?.checkIn).toBe('2026-11-10');
    expect(updated?.checkOut).toBe('2026-11-15');
    expect(updated?.stayNights).toBe(5);
    // 1200 * 5 = 6000
    expect(updated?.totalHotelPrice).toBe(6000);
  });

  it('invalid inline date range (check-out before check-in) shows error message and does not save', () => {
    component.openDateEditor();

    // Check-out earlier than check-in
    const newIn = new Date(2026, 10, 15);
    const newOut = new Date(2026, 10, 12);

    (component as any).editCheckInDate.set(newIn);
    (component as any).editCheckOutDate.set(newOut);
    component.validateAndApplyDates();

    expect(component.dateErrorMessage()).not.toBeNull();
    expect(component.dateErrorMessage()).toContain('Check-out date must be after check-in date');
    // State remains previous valid state
    expect(bookingState.hotelBooking()?.checkIn).toBe('2026-11-05');
  });

  it('resolves hotel bus stop and fetches outgoing and return suggestions when origin is selected', async () => {
    await component.resolveHotelBusStop(mockHotel as any);
    expect(component.hotelBusStop()?.id).toBe(20);

    // Select Cairo terminal as origin
    component.onOriginStopChange(10);
    await component.fetchRecommendations();

    expect(component.outgoingTrips().length).toBe(1);
    expect(component.outgoingTrips()[0].bus?.company).toBe('Go Bus Egypt');
    expect(component.outgoingTrips()[0].isPreferredTiming).toBe(true);
    expect(component.outgoingTrips()[0].timingBadgeLabel).toContain('Recommended');

    expect(component.returnTrips().length).toBe(1);
    expect(component.returnTrips()[0].timingBadgeLabel).toBe('');
    expect(component.returnTrips()[0].isPreferredTiming).toBe(false);
  });

  it('shows empty state when no matching trips are found', async () => {
    await component.resolveHotelBusStop(mockHotel as any);

    // Override trips service to return empty
    mockBusTripService.getAllBusTrips.mockReturnValue(of({ content: [] }));

    component.onOriginStopChange(10);
    await component.fetchRecommendations();

    expect(component.outgoingTrips().length).toBe(0);
    expect(component.hasSearchedTrips()).toBe(true);
  });
});
