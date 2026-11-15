import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { of } from 'rxjs';
import { HotelBookingsComponent } from './hotel-bookings.component';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { AuthService } from '../../../core/services/auth.service';
import { MessageService } from 'primeng/api';

describe('HotelBookingsComponent', () => {
  let component: HotelBookingsComponent;
  let mockHotelBookingService: any;
  let mockAuthService: any;
  let injector: Injector;

  beforeEach(() => {
    mockHotelBookingService = {
      getMyHotelBookings: vi.fn().mockReturnValue(
        of([
          {
            id: 1,
            checkIn: '2026-11-20',
            checkOut: '2026-11-25',
            guests: 2,
            status: 'PENDING',
            totalPrice: 5000,
            userId: 1,
            roomId: 101,
            hotelId: 10,
            hotelName: 'Grand Nile Plaza',
          },
        ])
      ),
    };

    mockAuthService = {
      currentUser: vi.fn().mockReturnValue({ id: 1, email: 'user@example.com', role: 'USER' }),
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    injector = Injector.create({
      providers: [
        { provide: HotelBookingService, useValue: mockHotelBookingService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MessageService, useValue: { add: vi.fn() } },
        HotelBookingsComponent,
      ],
    });

    component = runInInjectionContext(injector, () => injector.get(HotelBookingsComponent));
  });

  it('loads customer hotel bookings on init with status PENDING', () => {
    component.ngOnInit();
    expect(mockHotelBookingService.getMyHotelBookings).toHaveBeenCalled();
    expect(component.bookings().length).toBe(1);
    expect(component.bookings()[0].status).toBe('PENDING');
  });

  it('has no customer cancel action or dialog', () => {
    expect((component as any).cancelDialogVisible).toBeUndefined();
    expect((component as any).confirmCancel).toBeUndefined();
    expect((component as any).canCancelBooking).toBeUndefined();
  });

  describe('Guest breakdown rendering (Part A)', () => {
    it('calculates guest breakdown with adults, children count, and age labels', () => {
      const booking = {
        id: 2,
        checkIn: '2026-11-20',
        checkOut: '2026-11-25',
        guests: 4,
        adults: 2,
        childAges: [14, 5],
        status: 'PENDING' as const,
        totalPrice: 6000,
        userId: 1,
        roomId: 101,
        hotelId: 10,
        hotelName: 'Grand Nile Plaza',
      };

      const breakdown = component.getGuestBreakdown(booking);

      expect(breakdown.totalGuests).toBe(4);
      expect(breakdown.adultsCount).toBe(2);
      expect(breakdown.childrenCount).toBe(2);
      expect(breakdown.children[0]).toEqual({
        age: 14,
        isFree: false,
        isChargeable: true,
        label: '14 yrs (Chargeable)',
      });
      expect(breakdown.children[1]).toEqual({
        age: 5,
        isFree: true,
        isChargeable: false,
        label: '5 yrs (Free)',
      });
      expect(breakdown.freeChildrenCount).toBe(1);
      expect(breakdown.chargeableChildrenCount).toBe(1);
      expect(breakdown.requiredCapacity).toBe(3);
    });

    it('falls back gracefully when adults or childAges are missing', () => {
      const legacyBooking = {
        id: 3,
        checkIn: '2026-11-20',
        checkOut: '2026-11-25',
        guests: 2,
        status: 'CONFIRMED' as const,
        totalPrice: 4000,
        userId: 1,
        roomId: 102,
        hotelId: 10,
        hotelName: 'Grand Nile Plaza',
      };

      const breakdown = component.getGuestBreakdown(legacyBooking);

      expect(breakdown.totalGuests).toBe(2);
      expect(breakdown.adultsCount).toBe(2);
      expect(breakdown.childrenCount).toBe(0);
      expect(breakdown.children).toEqual([]);
    });
  });

  describe('Status Filters (Part C)', () => {
    beforeEach(() => {
      component.bookings.set([
        { id: 1, status: 'PENDING' } as any,
        { id: 2, status: 'PENDING' } as any,
        { id: 3, status: 'CONFIRMED' } as any,
        { id: 4, status: 'COMPLETED' } as any,
        { id: 5, status: 'CANCELLED' } as any,
      ]);
    });

    it('computes statusOptions with dynamic counts for all backend statuses', () => {
      const options = component.statusOptions();
      expect(options).toEqual([
        { label: 'All (5)', value: 'ALL' },
        { label: 'Pending (2)', value: 'PENDING' },
        { label: 'Confirmed (1)', value: 'CONFIRMED' },
        { label: 'Completed (1)', value: 'COMPLETED' },
        { label: 'Cancelled (1)', value: 'CANCELLED' },
      ]);
    });

    it('filters bookings in memory by selectedStatus', () => {
      expect(component.filteredBookings().length).toBe(5);

      component.onStatusChange('PENDING');
      expect(component.filteredBookings().length).toBe(2);
      expect(component.filteredBookings().every((b) => b.status === 'PENDING')).toBe(true);

      component.onStatusChange('CONFIRMED');
      expect(component.filteredBookings().length).toBe(1);
      expect(component.filteredBookings()[0].id).toBe(3);

      component.onStatusChange('CANCELLED');
      expect(component.filteredBookings().length).toBe(1);
      expect(component.filteredBookings()[0].id).toBe(5);
    });

    it('returns empty array when no bookings match filter and resets on resetStatusFilter', () => {
      component.bookings.set([
        { id: 1, status: 'CONFIRMED' } as any,
      ]);

      component.onStatusChange('PENDING');
      expect(component.filteredBookings().length).toBe(0);

      component.resetStatusFilter();
      expect(component.selectedStatus()).toBe('ALL');
      expect(component.filteredBookings().length).toBe(1);
    });
  });
});

