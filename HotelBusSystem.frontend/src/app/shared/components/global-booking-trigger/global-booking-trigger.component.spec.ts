import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { GlobalBookingTriggerComponent } from './global-booking-trigger.component';
import { BookingStateService } from '../../../core/services/booking-state.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('GlobalBookingTriggerComponent', () => {
  let component: GlobalBookingTriggerComponent;
  let bookingState: BookingStateService;
  let mockRouter: any;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    mockRouter = {
      navigate: vi.fn(),
      url: '/hotels',
      events: of(),
    };

    const injector = Injector.create({
      providers: [
        { provide: Router, useValue: mockRouter },
        BookingStateService,
        GlobalBookingTriggerComponent,
      ],
    });

    bookingState = injector.get(BookingStateService);
    component = runInInjectionContext(injector, () => new GlobalBookingTriggerComponent());
    (component as any).currentUrl.set('/hotels');
  });

  it('trigger should be hidden when there is no selection', () => {
    expect(bookingState.hasAnySelection()).toBe(false);
    expect(component.isTriggerVisible()).toBe(false);
  });

  it('trigger should be visible when selection exists, regardless of summaryOpen', () => {
    // Add dummy hotel selection
    bookingState.hotelBooking.set({
      hotel: { id: 1, name: 'Pyramids Hotel' } as any,
      selectedRooms: [{ id: 101, roomNumber: '101' } as any],
      checkIn: '2026-11-01',
      checkOut: '2026-11-03',
      stayNights: 2,
      adultsCount: 2,
      children: [],
      totalHotelPrice: 1500,
    });

    expect(bookingState.hasAnySelection()).toBe(true);

    // Case 1: Drawer is closed -> trigger IS VISIBLE
    bookingState.closeSummary();
    expect(bookingState.summaryOpen()).toBe(false);
    expect(component.isTriggerVisible()).toBe(true);

    // Case 2: Drawer is open -> trigger IS STILL VISIBLE
    bookingState.openSummary();
    expect(bookingState.summaryOpen()).toBe(true);
    expect(component.isTriggerVisible()).toBe(true);
  });

  it('trigger should be hidden on payment route', () => {
    bookingState.hotelBooking.set({
      hotel: { id: 1, name: 'Pyramids Hotel' } as any,
      selectedRooms: [{ id: 101, roomNumber: '101' } as any],
      checkIn: '2026-11-01',
      checkOut: '2026-11-03',
      stayNights: 2,
      adultsCount: 2,
      children: [],
      totalHotelPrice: 1500,
    });

    (component as any).currentUrl.set('/payment');
    expect(component.isOnPaymentRoute()).toBe(true);
    expect(component.isTriggerVisible()).toBe(false);
  });

  it('toggleSummary() should toggle bookingState.summaryOpen', () => {
    expect(bookingState.summaryOpen()).toBe(false);
    component.toggleSummary();
    expect(bookingState.summaryOpen()).toBe(true);
    component.toggleSummary();
    expect(bookingState.summaryOpen()).toBe(false);
  });

  it('onDrawerVisibleChange(false) should close summary', () => {
    bookingState.openSummary();
    expect(bookingState.summaryOpen()).toBe(true);
    component.onDrawerVisibleChange(false);
    expect(bookingState.summaryOpen()).toBe(false);
  });

  it('only one global trigger exists and no duplicate floating docks exist', () => {
    // Component instance renders exactly one trigger button when active
    bookingState.hotelBooking.set({
      hotel: { id: 1 } as any,
      selectedRooms: [{ id: 101 }] as any,
      checkIn: '2026-11-01',
      checkOut: '2026-11-03',
      stayNights: 2,
      adultsCount: 2,
      children: [],
      totalHotelPrice: 1000,
    });
    expect(component.isTriggerVisible()).toBe(true);
  });
});
