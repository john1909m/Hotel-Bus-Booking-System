import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { BookingStateService, HotelBookingState } from './booking-state.service';

describe('BookingStateService - Drawer Open/Close & Lifecycle State', () => {
  let service: BookingStateService;
  let mockRouter: any;

  beforeEach(() => {
    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    mockRouter = {
      navigate: vi.fn(),
      url: '/hotels',
    };

    const injector = Injector.create({
      providers: [
        { provide: Router, useValue: mockRouter },
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

    it('clearAll should reset standalone stay dates and guest counts', () => {
      service.checkIn.set('2026-11-01');
      service.checkOut.set('2026-11-05');
      service.adults.set(4);
      service.addChild(5);

      service.clearAll();

      expect(service.checkIn()).toBe('');
      expect(service.checkOut()).toBe('');
      expect(service.adults()).toBe(2);
      expect(service.children()).toEqual([]);
      expect(service.stayNights()).toBeNull();
    });
  });
});
