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
});
