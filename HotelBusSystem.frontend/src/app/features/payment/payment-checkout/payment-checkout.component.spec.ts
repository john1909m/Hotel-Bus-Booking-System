import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';

import { PaymentCheckoutComponent } from './payment-checkout.component';
import { BookingStateService } from '../../../core/services/booking-state.service';
import { AuthService } from '../../../core/services/auth.service';

describe('PaymentCheckoutComponent', () => {
  let component: PaymentCheckoutComponent;
  let mockRouter: any;
  let mockAuthService: any;
  let bookingState: BookingStateService;

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

  beforeEach(() => {
    storageMap.clear();

    mockRouter = {
      navigate: vi.fn(),
    };

    mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    const injector = Injector.create({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        BookingStateService,
      ],
    });

    runInInjectionContext(injector, () => {
      bookingState = injector.get(BookingStateService);
      component = new PaymentCheckoutComponent();
    });
  });

  it('should initialize with default credit card method selected', () => {
    expect(component.selectedMethod()).toBe('CREDIT_CARD');
  });

  it('should update selected payment method on user selection', () => {
    component.selectPaymentMethod('PAYPAL');
    expect(component.selectedMethod()).toBe('PAYPAL');

    component.selectPaymentMethod('BANK_TRANSFER');
    expect(component.selectedMethod()).toBe('BANK_TRANSFER');
  });

  it('should clear summary and navigate back to hotels on onClearSummary', () => {
    bookingState.setHotelSelection({
      hotel: { id: 1, name: 'Grand Nile', city: 'Cairo', address: 'Tahrir', rating: 4.8 } as any,
      selectedRooms: [{ id: 101, roomNumber: '101', roomType: 'DOUBLE', capacity: 2, pricePerNight: 1000, hotelId: 1 }],
      checkIn: '2026-11-10',
      checkOut: '2026-11-15',
      stayNights: 5,
      adultsCount: 2,
      children: [],
      totalHotelPrice: 5000,
    });

    expect(bookingState.hasHotel()).toBe(true);
    component.onClearSummary();

    expect(bookingState.hasHotel()).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/hotels']);
  });

  it('should simulate payment authorization and reveal confirmation dialog with reference', () => {
    vi.useFakeTimers();
    try {
      bookingState.setHotelSelection({
        hotel: { id: 1, name: 'Grand Nile', city: 'Cairo', address: 'Tahrir', rating: 4.8 } as any,
        selectedRooms: [{ id: 101, roomNumber: '101', roomType: 'DOUBLE', capacity: 2, pricePerNight: 1000, hotelId: 1 }],
        checkIn: '2026-11-10',
        checkOut: '2026-11-15',
        stayNights: 5,
        adultsCount: 2,
        children: [],
        totalHotelPrice: 5000,
      });

      component.onProcessPayment();
      expect(component.isProcessing()).toBe(true);

      vi.advanceTimersByTime(1200);

      expect(component.isProcessing()).toBe(false);
      expect(component.confirmationDialogVisible()).toBe(true);
      expect(component.confirmedReference()).toMatch(/^TE-\d{6}$/);
      expect(bookingState.hasAnySelection()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should return label for known and unknown room types', () => {
    expect(component.getRoomTypeLabel('SINGLE')).toBe('Single Room');
    expect(component.getRoomTypeLabel('DOUBLE')).toBe('Double Room');
    expect(component.getRoomTypeLabel('SUITE')).toBe('Executive Suite');
    expect(component.getRoomTypeLabel('DELUXE')).toBe('Deluxe Room');
  });

  it('should allow removing a room or removing transportation', () => {
    bookingState.setHotelSelection({
      hotel: { id: 1, name: 'Grand Nile', city: 'Cairo', address: 'Tahrir', rating: 4.8 } as any,
      selectedRooms: [
        { id: 101, roomNumber: '101', roomType: 'DOUBLE', capacity: 2, pricePerNight: 1000, hotelId: 1 },
        { id: 102, roomNumber: '102', roomType: 'SINGLE', capacity: 1, pricePerNight: 800, hotelId: 1 },
      ],
      checkIn: '2026-11-10',
      checkOut: '2026-11-15',
      stayNights: 5,
      adultsCount: 2,
      children: [],
      totalHotelPrice: 9000,
    });

    component.onRemoveRoom(101);
    expect(bookingState.hotelBooking()?.selectedRooms.length).toBe(1);
    expect(bookingState.hotelBooking()?.selectedRooms[0].id).toBe(102);

    component.onRemoveTransportation();
    expect(bookingState.hasTransportation()).toBe(false);
  });
});
