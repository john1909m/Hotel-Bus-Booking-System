import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { of } from 'rxjs';
import { BusBookingsComponent } from './BusBookings.component';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { BusTripService } from '../../../core/services/bus-trip.service';
import { BusRouteService } from '../../../core/services/bus-route.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusService } from '../../../core/services/bus.service';
import { AuthService } from '../../../core/services/auth.service';
import { MessageService } from 'primeng/api';

describe('BusBookingsComponent', () => {
  let component: BusBookingsComponent;
  let mockBusBookingService: any;
  let mockAuthService: any;
  let injector: Injector;

  beforeEach(() => {
    mockBusBookingService = {
      getMyBusBookings: vi.fn().mockReturnValue(
        of([
          { id: 101, bookingDate: '2026-11-20', status: 'PENDING', price: 150, userId: 1, busTripId: 10, seatId: 5 },
        ])
      ),
    };

    mockAuthService = {
      currentUser: vi.fn().mockReturnValue({ id: 1, email: 'user@example.com', role: 'USER' }),
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    injector = Injector.create({
      providers: [
        { provide: BusBookingService, useValue: mockBusBookingService },
        { provide: BusTripService, useValue: { getBusTripById: vi.fn().mockReturnValue(of({ id: 10, routeId: 1 })) } },
        { provide: BusRouteService, useValue: { getBusRouteById: vi.fn().mockReturnValue(of({ id: 1 })) } },
        { provide: BusStopService, useValue: { getBusStopById: vi.fn().mockReturnValue(of({ id: 1 })) } },
        { provide: BusSeatService, useValue: { getBusSeatById: vi.fn().mockReturnValue(of({ id: 5, seatNumber: '1A' })) } },
        { provide: BusService, useValue: { getBusById: vi.fn().mockReturnValue(of({ id: 1 })) } },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MessageService, useValue: { add: vi.fn() } },
        BusBookingsComponent,
      ],
    });

    component = runInInjectionContext(injector, () => injector.get(BusBookingsComponent));
  });

  it('loads customer bus bookings on initialization', () => {
    component.ngOnInit();
    expect(mockBusBookingService.getMyBusBookings).toHaveBeenCalled();
    expect(component.bookings().length).toBe(1);
    expect(component.bookings()[0].status).toBe('PENDING');
  });

  it('has no customer cancel action or dialog', () => {
    expect((component as any).cancelDialogVisible).toBeUndefined();
    expect((component as any).confirmCancel).toBeUndefined();
    expect((component as any).canCancelBooking).toBeUndefined();
  });

  describe('Status Filters (Part C)', () => {
    beforeEach(() => {
      component.bookings.set([
        { id: 101, status: 'PENDING' } as any,
        { id: 102, status: 'PENDING' } as any,
        { id: 103, status: 'CONFIRMED' } as any,
        { id: 104, status: 'COMPLETED' } as any,
        { id: 105, status: 'CANCELLED' } as any,
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
      expect(component.filteredBookings()[0].id).toBe(103);

      component.onStatusChange('COMPLETED');
      expect(component.filteredBookings().length).toBe(1);
      expect(component.filteredBookings()[0].id).toBe(104);

      component.onStatusChange('CANCELLED');
      expect(component.filteredBookings().length).toBe(1);
      expect(component.filteredBookings()[0].id).toBe(105);
    });

    it('returns empty array when no bookings match filter and resets on resetStatusFilter', () => {
      component.bookings.set([
        { id: 101, status: 'CONFIRMED' } as any,
      ]);

      component.onStatusChange('PENDING');
      expect(component.filteredBookings().length).toBe(0);

      component.resetStatusFilter();
      expect(component.selectedStatus()).toBe('ALL');
      expect(component.filteredBookings().length).toBe(1);
    });
  });
});
