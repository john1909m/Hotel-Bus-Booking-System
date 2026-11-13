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
});

