import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { UserBookings } from './user-bookings';
import { UserService } from '../../../core/services/user.service';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { PaymentService } from '../../../core/services/payment.service';
import { MessageService } from 'primeng/api';
import { UserDto } from '../../../core/models/User/user.model';
import { HotelBookingDTO } from '../../../core/models/Hotel/hotel-booking.model';
import { BusBookingDTO } from '../../../core/models/Bus/bus-booking.model';
import { PaymentDTO } from '../../../core/models/Payment/payment.model';
import { PageUserDto } from '../../../core/models/Pagination/userPage.model';
import { PageHotelBookingDTO } from '../../../core/models/Pagination/hotelBookingPage.model';
import { PageBusBookingDTO } from '../../../core/models/Pagination/busBookingPage.model';

describe('UserBookings Component', () => {
  let component: UserBookings;
  let mockUserService: any;
  let mockHotelBookingService: any;
  let mockBusBookingService: any;
  let mockPaymentService: any;
  let mockMessageService: any;

  const mockUsers: UserDto[] = [
    { id: 10, name: 'Alice Smith', email: 'alice@example.com', phoneNumber: '123456', role: 'USER' },
    { id: 11, name: 'Bob Jones', email: 'bob@example.com', phoneNumber: '789012', role: 'USER' },
  ];

  const mockHotelBookings: HotelBookingDTO[] = [
    {
      id: 101,
      checkIn: '2026-12-01',
      checkOut: '2026-12-05',
      guests: 3,
      status: 'CONFIRMED',
      totalPrice: 450,
      userId: 10,
      roomId: 1,
      hotelId: 1,
      hotelName: 'Grand Nile Hotel',
    },
    {
      id: 102,
      checkIn: '2026-12-10',
      checkOut: '2026-12-12',
      guests: 2,
      status: 'PENDING',
      totalPrice: 200,
      userId: 10,
      roomId: 2,
      hotelId: 1,
      hotelName: 'Grand Nile Hotel',
    },
  ];

  const mockBusBookings: BusBookingDTO[] = [
    {
      id: 201,
      busTripId: 50,
      seatId: 12,
      bookingDate: '2026-12-01',
      status: 'CONFIRMED',
      price: 65,
      userId: 10,
    },
  ];

  const mockPaymentsHotel101: PaymentDTO[] = [
    {
      id: 501,
      amount: 450,
      paymentMethod: 'CREDIT_CARD' as any,
      paymentStatus: 'COMPLETED' as any,
      transactionDate: '2026-12-01T10:00:00',
      hotelBookingId: 101,
    },
  ];

  beforeEach(() => {
    mockUserService = {
      getAllUsers: vi.fn().mockReturnValue(
        of({
          content: mockUsers,
          totalElements: 2,
        } as PageUserDto)
      ),
      getAllUsersList: vi.fn().mockReturnValue(of(mockUsers)),
    };

    mockHotelBookingService = {
      getAllHotelBookings: vi.fn().mockReturnValue(
        of({
          content: mockHotelBookings,
          totalElements: 2,
        } as PageHotelBookingDTO)
      ),
    };

    mockBusBookingService = {
      getAllBusBookings: vi.fn().mockReturnValue(
        of({
          content: mockBusBookings,
          totalElements: 1,
        } as PageBusBookingDTO)
      ),
    };

    mockPaymentService = {
      getPaymentsByHotelBookingId: vi.fn().mockImplementation((hotelBookingId: number) => {
        if (hotelBookingId === 101) return of(mockPaymentsHotel101);
        return of([]);
      }),
      getPaymentsByBusBookingId: vi.fn().mockReturnValue(of([])),
    };

    mockMessageService = {
      add: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: HotelBookingService, useValue: mockHotelBookingService },
        { provide: BusBookingService, useValue: mockBusBookingService },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    component = runInInjectionContext(injector, () => new UserBookings());
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should initialize and load user options', () => {
    component.ngOnInit();

    expect(mockUserService.getAllUsersList).toHaveBeenCalled();
    expect(component.users().length).toBe(2);
    expect(component.userOptions().length).toBe(2);
    expect(component.userOptions()[0].label).toBe('Alice Smith (alice@example.com)');
  });

  it('should load hotel and bus bookings with verified userId param when a user is selected', () => {
    component.ngOnInit();
    component.onUserChange(10);

    expect(component.selectedUserId()).toBe(10);
    expect(mockHotelBookingService.getAllHotelBookings).toHaveBeenCalledWith({ userId: 10, size: 100 });
    expect(mockBusBookingService.getAllBusBookings).toHaveBeenCalledWith({ userId: 10, size: 100 });
    expect(mockPaymentService.getPaymentsByHotelBookingId).toHaveBeenCalledWith(101);
    expect(mockPaymentService.getPaymentsByHotelBookingId).toHaveBeenCalledWith(102);
    expect(mockPaymentService.getPaymentsByBusBookingId).toHaveBeenCalledWith(201);

    expect(component.hotelBookings().length).toBe(2);
    expect(component.busBookings().length).toBe(1);
    expect(component.totalLoadedCount()).toBe(3);
  });

  it('should correctly attach payment methods and fallback to "No payment"', () => {
    component.ngOnInit();
    component.onUserChange(10);

    const hotels = component.displayedHotelBookings();
    expect(hotels[0].id).toBe(101);
    expect(hotels[0].paymentMethod).toBe('CREDIT_CARD');
    expect(hotels[1].id).toBe(102);
    expect(hotels[1].paymentMethod).toBe('No payment');

    const buses = component.displayedBusBookings();
    expect(buses[0].id).toBe(201);
    expect(buses[0].paymentMethod).toBe('No payment');
  });

  it('should filter bookings by status', () => {
    component.ngOnInit();
    component.onUserChange(10);

    component.onStatusChange('CONFIRMED');

    const filteredHotels = component.displayedHotelBookings();
    expect(filteredHotels.length).toBe(1);
    expect(filteredHotels[0].id).toBe(101);

    const filteredBuses = component.displayedBusBookings();
    expect(filteredBuses.length).toBe(1);
    expect(filteredBuses[0].id).toBe(201);

    component.onStatusChange('PENDING');
    expect(component.displayedHotelBookings().length).toBe(1);
    expect(component.displayedHotelBookings()[0].id).toBe(102);
    expect(component.displayedBusBookings().length).toBe(0);
  });

  it('should filter bookings by payment method', () => {
    component.ngOnInit();
    component.onUserChange(10);

    // Filter by CREDIT_CARD
    component.onPaymentMethodChange('CREDIT_CARD');
    expect(component.displayedHotelBookings().length).toBe(1);
    expect(component.displayedHotelBookings()[0].id).toBe(101);
    expect(component.displayedBusBookings().length).toBe(0);

    // Filter by 'No payment'
    component.onPaymentMethodChange('No payment');
    expect(component.displayedHotelBookings().length).toBe(1);
    expect(component.displayedHotelBookings()[0].id).toBe(102);
    expect(component.displayedBusBookings().length).toBe(1);
    expect(component.displayedBusBookings()[0].id).toBe(201);
  });

  it('should handle independent error state for hotel bookings without affecting bus bookings', () => {
    mockHotelBookingService.getAllHotelBookings.mockReturnValue(throwError(() => new Error('Server 500 error on hotels')));
    component.ngOnInit();
    component.onUserChange(10);

    expect(component.loadingHotel()).toBe(false);
    expect(component.errorHotel()).toBe('Server 500 error on hotels');
    expect(component.hotelBookings().length).toBe(0);

    // Bus bookings should succeed independently
    expect(component.loadingBus()).toBe(false);
    expect(component.errorBus()).toBeNull();
    expect(component.busBookings().length).toBe(1);
  });

  it('should handle independent error state for bus bookings without affecting hotel bookings', () => {
    mockBusBookingService.getAllBusBookings.mockReturnValue(throwError(() => new Error('Network timeout on bus bookings')));
    component.ngOnInit();
    component.onUserChange(10);

    expect(component.loadingBus()).toBe(false);
    expect(component.errorBus()).toBe('Network timeout on bus bookings');
    expect(component.busBookings().length).toBe(0);

    // Hotel bookings should succeed independently
    expect(component.loadingHotel()).toBe(false);
    expect(component.errorHotel()).toBeNull();
    expect(component.hotelBookings().length).toBe(2);
  });

  it('should clear bookings when user is deselected', () => {
    component.ngOnInit();
    component.onUserChange(10);
    expect(component.totalLoadedCount()).toBe(3);

    component.onUserChange(null);
    expect(component.selectedUserId()).toBeNull();
    expect(component.hotelBookings().length).toBe(0);
    expect(component.busBookings().length).toBe(0);
  });
});
