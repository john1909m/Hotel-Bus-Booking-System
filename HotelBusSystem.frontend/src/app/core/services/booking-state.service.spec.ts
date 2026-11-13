import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { BookingStateService, HotelBookingState } from './booking-state.service';

describe('BookingStateService - Drawer Open/Close & Lifecycle State', () => {
  let service: BookingStateService;
  let mockRouter: any;
  let mockAuthService: any;

  beforeEach(() => {
    // Clear localStorage and sessionStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }

    mockRouter = {
      navigate: vi.fn(),
      url: '/hotels',
    };

    mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      ensureInitialized: vi.fn().mockResolvedValue(null),
    };

    const injector = Injector.create({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        BookingStateService,
      ],
    });

    service = runInInjectionContext(injector, () => injector.get(BookingStateService));
  });

  it('should initialize summaryOpen to false', () => {
    expect(service.summaryOpen()).toBe(false);
    expect(service.isSummaryPopupOpen()).toBe(false);
  });

  it('openSummary() should set summaryOpen to true', () => {
    service.openSummary();
    expect(service.summaryOpen()).toBe(true);
    expect(service.isSummaryPopupOpen()).toBe(true);
  });

  it('closeSummary() should set summaryOpen to false without clearing booking selections', () => {
    const mockHotelState: HotelBookingState = {
      hotel: { id: 1, name: 'Grand Nile', city: 'Cairo' } as any,
      selectedRooms: [{ id: 101, roomNumber: '101', roomType: 'DELUXE', capacity: 2, pricePerNight: 1000 } as any],
      checkIn: '2026-11-01',
      checkOut: '2026-11-03',
      stayNights: 2,
      adultsCount: 2,
      children: [],
      totalHotelPrice: 2000,
    };
    service.hotelBooking.set(mockHotelState);
    service.openSummary();
    expect(service.summaryOpen()).toBe(true);
    expect(service.hasHotel()).toBe(true);

    // Now close
    service.closeSummary();
    expect(service.summaryOpen()).toBe(false);
    // Booking selection must remain completely intact!
    expect(service.hasHotel()).toBe(true);
    expect(service.hotelBooking()?.hotel.name).toBe('Grand Nile');
    expect(service.hotelBooking()?.selectedRooms.length).toBe(1);
  });

  it('setSummaryOpen(value) should set summaryOpen to the specified boolean', () => {
    service.setSummaryOpen(true);
    expect(service.summaryOpen()).toBe(true);
    service.setSummaryOpen(false);
    expect(service.summaryOpen()).toBe(false);
  });

  it('toggleSummary() should flip summaryOpen value', () => {
    expect(service.summaryOpen()).toBe(false);
    service.toggleSummary();
    expect(service.summaryOpen()).toBe(true);
    service.toggleSummary();
    expect(service.summaryOpen()).toBe(false);
  });

  it('clearSummary() should clear selections and set summaryOpen to false', () => {
    service.hotelBooking.set({
      hotel: { id: 1, name: 'Grand Nile' } as any,
      selectedRooms: [{ id: 101 }] as any,
      checkIn: '2026-11-01',
      checkOut: '2026-11-03',
      stayNights: 2,
      adultsCount: 2,
      children: [],
      totalHotelPrice: 2000,
    });
    service.openSummary();
    expect(service.summaryOpen()).toBe(true);
    expect(service.hasAnySelection()).toBe(true);

    service.clearSummary();
    expect(service.summaryOpen()).toBe(false);
    expect(service.hasAnySelection()).toBe(false);
    expect(service.hotelBooking()).toBeNull();
  });

  it('continueToPayment() should close summary, set hideTriggerOnPayment, and navigate', () => {
    service.openSummary();
    expect(service.summaryOpen()).toBe(true);

    service.continueToPayment();
    expect(service.summaryOpen()).toBe(false);
    expect(service.hideTriggerOnPayment()).toBe(true);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/payment']);
  });

  describe('Date Validation & Update Helpers', () => {
    it('validateStayDates should accept valid future date ranges and calculate nights', () => {
      const today = new Date();
      const inDate = new Date(today);
      inDate.setDate(inDate.getDate() + 5);
      const outDate = new Date(today);
      outDate.setDate(outDate.getDate() + 9);

      const inIso = service.formatDateToIso(inDate);
      const outIso = service.formatDateToIso(outDate);

      const result = service.validateStayDates(inIso, outIso);
      expect(result.isValid).toBe(true);
      expect(result.nights).toBe(4);
      expect(result.error).toBeUndefined();
    });

    it('validateStayDates should reject check-out before or equal to check-in', () => {
      const today = new Date();
      const inDate = new Date(today);
      inDate.setDate(inDate.getDate() + 5);
      const outDate = new Date(today);
      outDate.setDate(outDate.getDate() + 3);

      const inIso = service.formatDateToIso(inDate);
      const outIso = service.formatDateToIso(outDate);

      const result = service.validateStayDates(inIso, outIso);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Check-out date must be after check-in date');
    });

    it('validateStayDates should reject check-in dates in the past', () => {
      const past = new Date();
      past.setDate(past.getDate() - 3);
      const future = new Date();
      future.setDate(future.getDate() + 2);

      const inIso = service.formatDateToIso(past);
      const outIso = service.formatDateToIso(future);

      const result = service.validateStayDates(inIso, outIso);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Check-in date cannot be in the past');
    });

    it('setStayDates should update checkIn, checkOut, stayNights signals and recalculate hotel total', () => {
      service.hotelBooking.set({
        hotel: { id: 1, name: 'Grand Nile' } as any,
        selectedRooms: [
          { id: 101, pricePerNight: 1000 } as any,
          { id: 102, pricePerNight: 1500 } as any,
        ],
        checkIn: '2026-11-01',
        checkOut: '2026-11-03',
        stayNights: 2,
        adultsCount: 2,
        children: [],
        totalHotelPrice: 5000,
      });

      const today = new Date();
      const inDate = new Date(today);
      inDate.setDate(inDate.getDate() + 5);
      const outDate = new Date(today);
      outDate.setDate(outDate.getDate() + 9);
      const inIso = service.formatDateToIso(inDate);
      const outIso = service.formatDateToIso(outDate);

      const res = service.setStayDates(inIso, outIso);
      expect(res.isValid).toBe(true);
      expect(res.nights).toBe(4);
      expect(service.checkIn()).toBe(inIso);
      expect(service.checkOut()).toBe(outIso);
      expect(service.stayNights()).toBe(4);
      expect(service.hotelBooking()?.totalHotelPrice).toBe(10000);
    });

    it('setAdults, addChild, removeChild, setChildAge should update signals directly', () => {
      service.setAdults(3);
      expect(service.adults()).toBe(3);

      const child1Id = service.addChild(7);
      expect(service.children().length).toBe(1);
      expect(service.children()[0].age).toBe(7);

      const child2Id = service.addChild(14);
      expect(service.children().length).toBe(2);

      service.setChildAge(child1Id, 8);
      expect(service.children().find((c) => c.id === child1Id)?.age).toBe(8);

      service.removeChild(child2Id);
      expect(service.children().length).toBe(1);
      expect(service.children()[0].id).toBe(child1Id);
    });

    it('clearAll should reset standalone stay dates, guest counts, and resumeSummaryAfterLogin', () => {
      service.checkIn.set('2026-11-20');
      service.checkOut.set('2026-11-25');
      service.adults.set(4);
      service.addChild(5);
      service.resumeSummaryAfterLogin.set(true);

      service.clearAll();

      expect(service.checkIn()).toBe('');
      expect(service.checkOut()).toBe('');
      expect(service.adults()).toBe(2);
      expect(service.children()).toEqual([]);
      expect(service.stayNights()).toBeNull();
      expect(service.resumeSummaryAfterLogin()).toBe(false);
    });

    it('continueToPayment should redirect unauthenticated guest to login with returnUrl', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);
      mockRouter.url = '/hotels/42';

      service.continueToPayment();

      expect(service.resumeSummaryAfterLogin()).toBe(true);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/hotels/42' },
      });
    });

    it('continueToPayment should accept custom currentUrl for returnUrl', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);

      service.continueToPayment('/hotels/10?checkIn=2026-12-01&checkOut=2026-12-05');

      expect(service.resumeSummaryAfterLogin()).toBe(true);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/hotels/10?checkIn=2026-12-01&checkOut=2026-12-05' },
      });
    });

    it('continueToPayment should navigate directly to /payment when user is authenticated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      service.openSummary();

      service.continueToPayment();

      expect(service.summaryOpen()).toBe(false);
      expect(service.hideTriggerOnPayment()).toBe(true);
      expect(service.resumeSummaryAfterLogin()).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/payment']);
    });

    it('canContinueToPayment should be true for rooms only, true for transport only, and false when both are empty', () => {
      // 1. Both empty
      expect(service.hasHotel()).toBe(false);
      expect(service.hasTransportation()).toBe(false);
      expect(service.canContinueToPayment()).toBe(false);

      // 2. Transport only
      service.selectOutgoingTrip(
        { id: 10, price: 150, busId: 1 } as any,
        [{ id: 1, seatNumber: '1A', seatType: 'REGULAR', busId: 1 }],
        { id: 101, name: 'Stop A' } as any,
        { id: 102, name: 'Stop B' } as any
      );
      expect(service.hasTransportation()).toBe(true);
      expect(service.hasHotel()).toBe(false);
      expect(service.canContinueToPayment()).toBe(true);
      expect(service.transportationPrice()).toBe(150);
      expect(service.totalCombinedPrice()).toBe(150);

      // 3. Clear transport, set hotel only
      service.clearTransportationSelection();
      expect(service.hasTransportation()).toBe(false);
      expect(service.canContinueToPayment()).toBe(false);

      service.hotelBooking.set({
        hotel: { id: 1, name: 'Hotel Cairo' } as any,
        selectedRooms: [{ id: 201, roomNumber: '201', pricePerNight: 500 } as any],
        checkIn: '2026-12-01',
        checkOut: '2026-12-03',
        stayNights: 2,
        adultsCount: 2,
        children: [],
        totalHotelPrice: 1000,
      });
      expect(service.hasHotel()).toBe(true);
      expect(service.canContinueToPayment()).toBe(true);
      expect(service.hotelPrice()).toBe(1000);
      expect(service.totalCombinedPrice()).toBe(1000);
    });

    it('setting transport does not modify hotel stay dates or hotel total', () => {
      service.checkIn.set('2026-11-20');
      service.checkOut.set('2026-11-22');
      service.hotelBooking.set({
        hotel: { id: 1, name: 'Hotel Cairo' } as any,
        selectedRooms: [{ id: 201, pricePerNight: 500 } as any],
        checkIn: '2026-11-20',
        checkOut: '2026-11-22',
        stayNights: 2,
        adultsCount: 2,
        children: [],
        totalHotelPrice: 1000,
      });

      // Select bus trip
      service.selectOutgoingTrip(
        { id: 88, price: 200, busId: 2 } as any,
        [{ id: 1, seatNumber: '1A', seatType: 'REGULAR', busId: 2 }],
        null,
        null
      );

      // Hotel dates and prices remain unchanged
      expect(service.checkIn()).toBe('2026-11-20');
      expect(service.checkOut()).toBe('2026-11-22');
      expect(service.hotelBooking()?.checkIn).toBe('2026-11-20');
      expect(service.hotelBooking()?.totalHotelPrice).toBe(1000);
      expect(service.transportationPrice()).toBe(200);
      expect(service.totalCombinedPrice()).toBe(1200);
    });

    it('setting hotel dates does not modify transport selection or transport total', () => {
      service.selectOutgoingTrip(
        { id: 99, price: 300, busId: 3 } as any,
        [{ id: 5, seatNumber: '2B', seatType: 'REGULAR', busId: 3 }, { id: 6, seatNumber: '2C', seatType: 'REGULAR', busId: 3 }],
        null,
        null
      );
      expect(service.transportationPrice()).toBe(600);

      // Modify hotel dates
      service.setStayDates('2026-12-10', '2026-12-15');

      expect(service.transportationPrice()).toBe(600);
      expect(service.hasOutgoingTrip()).toBe(true);
      expect(service.transportationBooking()?.outgoing?.selectedSeats?.length).toBe(2);
    });
  });
});
