import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { BusSeatSelectionComponent } from './bus-seat-selection.component';
import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { BookingStateService } from '../../../core/services/booking-state.service';
import { AuthService } from '../../../core/services/auth.service';

describe('BusSeatSelectionComponent - Add to Booking Summary & Eligibility', () => {
  let component: BusSeatSelectionComponent;
  let bookingState: BookingStateService;
  let mockBusSeatService: any;
  let mockBusBookingService: any;
  let mockAuthService: any;
  let mockRouter: any;
  let mockMessageService: any;

  const mockTrip: any = {
    id: 42,
    busId: 7,
    price: 180,
    departureTime: '2026-11-20T08:00:00',
    arrivalTime: '2026-11-20T12:00:00',
    originStop: { id: 1, name: 'Cairo Terminal' },
    destinationStop: { id: 2, name: 'Alexandria Terminal' },
    distanceFromHotel: 2.5,
  };

  const mockSeats: any[] = [
    { id: 101, seatNumber: '1A', seatType: 'STANDARD', busId: 7 },
    { id: 102, seatNumber: '1B', seatType: 'STANDARD', busId: 7 },
  ];

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();

    mockBusSeatService = {
      getBusSeatsByBusId: vi.fn().mockReturnValue(of(mockSeats)),
    };

    mockBusBookingService = {
      getBusBookingsByBusTripId: vi.fn().mockReturnValue(of({ content: [] })),
      createBusBooking: vi.fn(),
    };

    mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      currentUser: vi.fn().mockReturnValue({ id: 9, name: 'Test User' }),
      ensureInitialized: vi.fn().mockResolvedValue(null),
    };

    mockRouter = {
      navigate: vi.fn(),
      url: '/buses/results',
    };

    mockMessageService = {
      add: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: BusSeatService, useValue: mockBusSeatService },
        { provide: BusBookingService, useValue: mockBusBookingService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: MessageService, useValue: mockMessageService },
        BookingStateService,
        BusSeatSelectionComponent,
      ],
    });

    bookingState = runInInjectionContext(injector, () => injector.get(BookingStateService));
    component = runInInjectionContext(injector, () => injector.get(BusSeatSelectionComponent));

    component.trip = mockTrip;
    component.allSeats.set(mockSeats);
  });

  it('submitBookings adds seats to BookingStateService and does NOT call createBusBooking API', () => {
    // Select seat 101
    component.onSeatClick(mockSeats[0]);
    expect(component.selectedSeatsCount()).toBe(1);

    component.submitBookings();

    // Verify createBusBooking was NOT called
    expect(mockBusBookingService.createBusBooking).not.toHaveBeenCalled();

    // Verify trip was added to BookingStateService
    expect(bookingState.hasTransportation()).toBe(true);
    expect(bookingState.hasOutgoingTrip()).toBe(true);
    expect(bookingState.transportationBooking()?.outgoing?.price).toBe(180);
    expect(bookingState.transportationBooking()?.outgoing?.selectedSeats.length).toBe(1);
    expect(bookingState.transportationBooking()?.outgoing?.selectedSeats[0].id).toBe(101);

    // Verify success toast
    expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'success',
      summary: 'Added to Booking Summary',
    }));
  });

  it('submitBookings blocks addition when trip is ineligible for selected hotel stay dates', () => {
    // Hotel check-in is 2026-12-10 (trip arrives 2026-11-20 -> ineligible!)
    bookingState.setHotelSelection({
      hotel: { id: 1, name: 'Red Sea Resort' } as any,
      selectedRooms: [{ id: 50, pricePerNight: 800 } as any],
      checkIn: '2026-12-10',
      checkOut: '2026-12-15',
      stayNights: 5,
      adultsCount: 2,
      children: [],
      totalHotelPrice: 4000,
    });

    component.direction = 'outgoing';
    component.onSeatClick(mockSeats[0]);
    component.submitBookings();

    // Does not call backend
    expect(mockBusBookingService.createBusBooking).not.toHaveBeenCalled();
    // Ineligible -> not added to transportation booking
    expect(bookingState.hasTransportation()).toBe(false);
    expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'error',
      summary: 'Trip Ineligible',
    }));
  });
});

