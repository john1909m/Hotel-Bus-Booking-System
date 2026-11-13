import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PaymentCheckoutComponent } from './payment-checkout.component';
import { BookingStateService } from '../../../core/services/booking-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';

describe('PaymentCheckoutComponent - Standalone Bus & Eligibility Verification', () => {
  let component: PaymentCheckoutComponent;
  let bookingState: BookingStateService;
  let mockRouter: any;
  let mockAuthService: any;
  let mockHotelBookingService: any;
  let mockBusBookingService: any;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();

    mockRouter = {
      navigate: vi.fn(),
      url: '/payment',
    };

    mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      currentUser: vi.fn().mockReturnValue({ id: 5, name: 'John Doe', email: 'john@example.com', role: 'USER' }),
    };

    mockHotelBookingService = {
      createHotelBooking: vi.fn().mockReturnValue(of({ id: 501, status: 'PENDING', checkIn: '2026-11-20', checkOut: '2026-11-25' })),
    };

    mockBusBookingService = {
      createBusBooking: vi.fn().mockImplementation((payload: any) =>
        of({ id: 1000 + payload.seatId, status: 'PENDING', busTripId: payload.busTripId, seatId: payload.seatId, price: payload.price })
      ),
    };

    const injector = Injector.create({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: HotelBookingService, useValue: mockHotelBookingService },
        { provide: BusBookingService, useValue: mockBusBookingService },
        BookingStateService,
        PaymentCheckoutComponent,
      ],
    });

    bookingState = runInInjectionContext(injector, () => injector.get(BookingStateService));
    component = runInInjectionContext(injector, () => injector.get(PaymentCheckoutComponent));
  });

  it('validateBooking fails when itinerary is completely empty', () => {
    bookingState.clearAll();
    const result = component.validateBooking();
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('itinerary is empty');
  });

  it('validateBooking passes with standalone bus trips only (no hotel)', () => {
    bookingState.clearAll();
    bookingState.selectOutgoingTrip(
      { id: 101, departure: '2026-11-20T08:00:00', arrivalTime: '2026-11-20T14:00:00', price: 150, busId: 1 } as any,
      [{ id: 11, seatNumber: '1A', seatType: 'STANDARD', busId: 1 }],
      { id: 1, name: 'Cairo' } as any,
      { id: 2, name: 'Alexandria' } as any
    );

    expect(bookingState.hasHotel()).toBe(false);
    expect(bookingState.hasTransportation()).toBe(true);

    const result = component.validateBooking();
    expect(result.isValid).toBe(true);
  });

  it('Pay with transport only: creates one bus booking per seat with status PENDING and no hotel booking call', () => {
    bookingState.clearAll();
    bookingState.selectOutgoingTrip(
      { id: 101, departure: '2026-11-20T08:00:00', price: 200, busId: 1 } as any,
      [
        { id: 10, seatNumber: '1A', seatType: 'STANDARD', busId: 1 },
        { id: 11, seatNumber: '1B', seatType: 'STANDARD', busId: 1 },
      ],
      { id: 1, name: 'Cairo' } as any,
      { id: 2, name: 'Hurghada' } as any
    );

    component.onProcessPayment();

    expect(mockBusBookingService.createBusBooking).toHaveBeenCalledTimes(2);
    expect(mockBusBookingService.createBusBooking).toHaveBeenNthCalledWith(1, expect.objectContaining({
      busTripId: 101,
      seatId: 10,
      status: 'PENDING',
      userId: 5,
    }));
    expect(mockBusBookingService.createBusBooking).toHaveBeenNthCalledWith(2, expect.objectContaining({
      busTripId: 101,
      seatId: 11,
      status: 'PENDING',
      userId: 5,
    }));
    expect(mockHotelBookingService.createHotelBooking).not.toHaveBeenCalled();
    expect(component.createdBusBookings().length).toBe(2);
    expect(component.confirmationDialogVisible()).toBe(true);
  });

  it('Pay with hotel + bus when hotel dates changed to make trip ineligible: blocks Pay and sends NO requests', () => {
    // Hotel check-in is 2026-12-01
    bookingState.setHotelSelection({
      hotel: { id: 1, name: 'Grand Nile' } as any,
      selectedRooms: [{ id: 101, pricePerNight: 500 } as any],
      checkIn: '2026-12-01',
      checkOut: '2026-12-05',
      stayNights: 4,
      adultsCount: 2,
      children: [],
      totalHotelPrice: 2000,
    });

    // Outgoing bus trip arrives on 2026-11-15 (NOT eligible for 2026-12-01 check-in!)
    bookingState.selectOutgoingTrip(
      {
        id: 55,
        departureTime: '2026-11-15T08:00:00',
        arrivalTime: '2026-11-15T12:00:00',
        price: 250,
        busId: 2,
        bus: { company: 'SuperJet' } as any,
        destinationStop: { id: 99, name: 'Hotel Stop' } as any,
      } as any,
      [{ id: 12, seatNumber: '3A', seatType: 'STANDARD', busId: 2 }],
      { id: 10, name: 'Cairo' } as any,
      { id: 99, name: 'Hotel Stop' } as any
    );

    component.onProcessPayment();

    expect(component.validationErrorMessage()).toContain('Outgoing bus trip');
    expect(component.validationErrorMessage()).toContain('no longer eligible');
    expect(mockBusBookingService.createBusBooking).not.toHaveBeenCalled();
    expect(mockHotelBookingService.createHotelBooking).not.toHaveBeenCalled();
  });

  it('Pay with hotel + bus when eligible: creates both bus and hotel with status PENDING', () => {
    bookingState.setHotelSelection({
      hotel: { id: 1, name: 'Grand Nile' } as any,
      selectedRooms: [{ id: 101, pricePerNight: 500 } as any],
      checkIn: '2026-12-01',
      checkOut: '2026-12-05',
      stayNights: 4,
      adultsCount: 2,
      children: [],
      totalHotelPrice: 2000,
    });

    // Outgoing bus trip arrives on 2026-12-01 (eligible!)
    bookingState.selectOutgoingTrip(
      {
        id: 77,
        departureTime: '2026-12-01T08:00:00',
        arrivalTime: '2026-12-01T12:00:00',
        price: 250,
        busId: 2,
        bus: { company: 'SuperJet' } as any,
        destinationStop: { id: 99, name: 'Hotel Stop' } as any,
      } as any,
      [{ id: 15, seatNumber: '4A', seatType: 'STANDARD', busId: 2 }],
      { id: 10, name: 'Cairo' } as any,
      { id: 99, name: 'Hotel Stop' } as any
    );

    component.onProcessPayment();

    expect(mockBusBookingService.createBusBooking).toHaveBeenCalledTimes(1);
    expect(mockHotelBookingService.createHotelBooking).toHaveBeenCalledTimes(1);
    expect(component.confirmationDialogVisible()).toBe(true);
    expect(component.createdHotelBooking()?.id).toBe(501);
  });

  it('Partial failure preserves state and shows error message with created IDs', () => {
    bookingState.clearAll();
    bookingState.selectOutgoingTrip(
      { id: 101, departure: '2026-11-20T08:00:00', price: 200, busId: 1 } as any,
      [
        { id: 21, seatNumber: '5A', seatType: 'STANDARD', busId: 1 },
        { id: 22, seatNumber: '5B', seatType: 'STANDARD', busId: 1 },
      ],
      null,
      null
    );

    // First seat succeeds, second seat throws conflict (SeatAlreadyBookedException)
    mockBusBookingService.createBusBooking
      .mockReturnValueOnce(of({ id: 1021, status: 'PENDING', busTripId: 101, seatId: 21, price: 200 }))
      .mockReturnValueOnce(throwError(() => ({ message: 'Seat already booked' })));

    component.onProcessPayment();

    expect(component.isProcessing()).toBe(false);
    expect(component.partialFailureMessage()).toContain('Created 1 bus booking(s) with status PENDING (#1021)');
    expect(component.partialFailureMessage()).toContain('Failed to reserve 1 bus seat(s)');
    // State is preserved!
    expect(bookingState.hasTransportation()).toBe(true);
  });
});

