import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { BusBookingsManagement } from './bus-bookings-management';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { BusTripService } from '../../../core/services/bus-trip.service';
import { BusRouteService } from '../../../core/services/bus-route.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusService } from '../../../core/services/bus.service';
import { UserService } from '../../../core/services/user.service';
import { MessageService } from 'primeng/api';
import { BusBookingDTO } from '../../../core/models/Bus/bus-booking.model';
import { BusTripDTO } from '../../../core/models/Bus/bus-trip.model';
import { BusRouteDTO } from '../../../core/models/Bus/bus-route';
import { BusStopDto } from '../../../core/models/Bus/bus-stop.model';
import { BusSeatDTO } from '../../../core/models/Bus/bus-seat.model';
import { BusDTO } from '../../../core/models/Bus/bus.model';
import { UserDto } from '../../../core/models/User/user.model';
import { PageBusBookingDTO } from '../../../core/models/Pagination/busBookingPage.model';

describe('BusBookingsManagement Component', () => {
  let component: BusBookingsManagement;
  let mockBookingService: any;
  let mockTripService: any;
  let mockRouteService: any;
  let mockStopService: any;
  let mockSeatService: any;
  let mockBusService: any;
  let mockUserService: any;
  let mockMessageService: any;

  const mockUsers: UserDto[] = [
    { id: 10, name: 'Alice Smith', email: 'alice@example.com', phone: '01011112222', role: 'USER' as any },
    { id: 20, name: 'Bob Jones', email: 'bob@example.com', phone: '01033334444', role: 'USER' as any },
  ];

  const mockBuses: BusDTO[] = [
    { id: 100, busNumber: 'BUS-101', company: 'SuperJet', capacity: 4, coachType: 'STANDARD' as any },
    { id: 200, busNumber: 'BUS-202', company: 'GoBus', capacity: 4, coachType: 'VIP' as any },
  ];

  const mockTrips: BusTripDTO[] = [
    { id: 501, busId: 100, routeId: 10, departureTime: '2026-12-01T08:00:00', arrivalTime: '2026-12-01T12:00:00', price: 150, status: 'SCHEDULED' as any },
    { id: 502, busId: 200, routeId: 20, departureTime: '2026-12-02T09:00:00', arrivalTime: '2026-12-02T14:00:00', price: 200, status: 'SCHEDULED' as any },
  ];

  const mockSeatsBus100: BusSeatDTO[] = [
    { id: 1, seatNumber: '1', seatType: 'PREMIUM', busId: 100 },
    { id: 2, seatNumber: '2', seatType: 'WINDOW', busId: 100 },
  ];

  const mockBookings: BusBookingDTO[] = [
    {
      id: 1,
      bookingDate: '2026-11-20',
      status: 'CONFIRMED',
      price: 150,
      userId: 10,
      busTripId: 501,
      seatId: 1,
    },
    {
      id: 2,
      bookingDate: '2026-11-21',
      status: 'PENDING',
      price: 200,
      userId: 20,
      busTripId: 502,
      seatId: 3,
    },
  ];

  const mockPageData: PageBusBookingDTO = {
    content: mockBookings,
    totalElements: 2,
    totalPages: 1,
    size: 10,
    number: 0,
    first: true,
    last: true,
    empty: false,
  };

  beforeEach(() => {
    mockBookingService = {
      getAllBusBookings: vi.fn().mockReturnValue(of(mockPageData)),
      createBusBooking: vi.fn().mockImplementation((payload) => of({ id: 99, ...payload })),
      updateBusBooking: vi.fn().mockImplementation((id, payload) => of({ id, ...payload })),
      updateBusBookingStatus: vi.fn().mockImplementation((id, status) => of({ id, status })),
      deleteBusBooking: vi.fn().mockReturnValue(of(undefined)),
    };

    mockTripService = {
      lookupBusTrips: vi.fn().mockReturnValue(of(mockTrips)),
      getBusTripById: vi.fn().mockImplementation((id) => {
        const found = mockTrips.find((t) => t.id === id);
        return of(found || null);
      }),
    };

    mockRouteService = {
      getBusRouteById: vi.fn().mockReturnValue(of({ id: 10, originStopId: 1, destinationStopId: 2, distanceKm: 220 })),
    };

    mockStopService = {
      getAllBusStops: vi.fn().mockReturnValue(of({ content: [{ id: 1, name: 'Cairo Station', city: 'Cairo' }, { id: 2, name: 'Alex Terminal', city: 'Alexandria' }] })),
    };

    mockSeatService = {
      getBusSeatById: vi.fn().mockImplementation((id) => of({ id, seatNumber: String(id), seatType: 'PREMIUM', busId: 100 })),
      getBusSeatsByBusId: vi.fn().mockImplementation((busId) => {
        if (busId === 100) return of(mockSeatsBus100);
        return of([]);
      }),
      createBusSeat: vi.fn().mockImplementation((req) => of({ id: 999, ...req })),
    };

    mockBusService = {
      getAllBuses: vi.fn().mockReturnValue(of({ content: mockBuses })),
      getBusById: vi.fn().mockImplementation((id) => {
        const found = mockBuses.find((b) => b.id === id);
        return of(found || null);
      }),
    };

    mockUserService = {
      getUsers: vi.fn().mockReturnValue(of({ content: mockUsers })),
      getUserById: vi.fn().mockImplementation((id) => {
        const found = mockUsers.find((u) => u.id === id);
        return of(found || null);
      }),
    };

    mockMessageService = {
      add: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        FormBuilder,
        { provide: BusBookingService, useValue: mockBookingService },
        { provide: BusTripService, useValue: mockTripService },
        { provide: BusRouteService, useValue: mockRouteService },
        { provide: BusStopService, useValue: mockStopService },
        { provide: BusSeatService, useValue: mockSeatService },
        { provide: BusService, useValue: mockBusService },
        { provide: UserService, useValue: mockUserService },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    component = runInInjectionContext(injector, () => new BusBookingsManagement());
    component.ngOnInit();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should initialize and load bookings, trips, users, and buses on init', () => {
    expect(mockBookingService.getAllBusBookings).toHaveBeenCalled();
    expect(mockTripService.lookupBusTrips).toHaveBeenCalled();
    expect(mockUserService.getUsers).toHaveBeenCalled();
    expect(mockBusService.getAllBuses).toHaveBeenCalled();
    expect(component.bookings().length).toBe(2);
    expect(component.usersList().length).toBe(2);
    expect(component.buses().length).toBe(2);
  });

  it('should populate userOptions and busOptions properly', () => {
    const users = component.userOptions();
    expect(users.length).toBe(2);
    expect(users[0].label).toContain('Alice Smith');
    expect(users[0].value).toBe(10);

    const buses = component.busOptions();
    expect(buses.length).toBe(2);
    expect(buses[0].label).toContain('BUS-101');
    expect(buses[0].value).toBe(100);
  });

  it('should correctly resolve Assigned Bus number and company for table column', () => {
    const booking = mockBookings[0];
    const busNumber = component.getBusNumberForBooking(booking);
    const company = component.getBusCompanyForBooking(booking);

    expect(busNumber).toBe('BUS-101');
    expect(company).toBe('SuperJet');
  });

  it('should filter trips and load seats when an Assigned Bus is selected', () => {
    component.onBusSelect(100);
    expect(component.selectedBusIdForForm()).toBe(100);
    expect(mockSeatService.getBusSeatsByBusId).toHaveBeenCalledWith(100);
    expect(component.busSeats().length).toBe(2);

    const trips = component.tripsForSelectedBus();
    expect(trips.length).toBe(1);
    expect(trips[0].id).toBe(501);
  });

  it('should prepare create dialog with default bus, user, and filtered trips', () => {
    component.openCreateDialog();
    expect(component.dialogVisible()).toBe(true);
    expect(component.isEditMode()).toBe(false);

    const formVal = component.bookingForm.getRawValue();
    expect(formVal.busId).toBe(100);
    expect(formVal.userId).toBe(10);
    expect(formVal.busTripId).toBe(501);
    expect(formVal.status).toBe('CONFIRMED');
  });

  it('should auto-load Assigned Bus, Trip, and format stored bookingDate in Edit mode', () => {
    const booking = mockBookings[0]; // trip 501 on bus 100, date '2026-11-20'
    component.openEditDialog(booking);

    expect(component.dialogVisible()).toBe(true);
    expect(component.isEditMode()).toBe(true);
    expect(component.editingBookingId()).toBe(1);

    const formVal = component.bookingForm.getRawValue();
    expect(formVal.busId).toBe(100);
    expect(formVal.busTripId).toBe(501);
    expect(formVal.userId).toBe(10);
    expect(formVal.seatId).toBe(1);
    expect(formVal.bookingDate).toBe('2026-11-20T00:00');
  });

  it('should save updated booking with LocalDate formatted bookingDate and omit busId from payload', () => {
    const booking = mockBookings[0];
    component.openEditDialog(booking);

    component.bookingForm.patchValue({
      bookingDate: '2026-12-25T14:30',
      price: 180,
    });

    component.saveBooking();

    expect(mockBookingService.updateBusBooking).toHaveBeenCalledWith(1, {
      busTripId: 501,
      userId: 10,
      seatId: 1,
      price: 180,
      status: 'CONFIRMED',
      bookingDate: '2026-12-25',
    });
  });

  it('should generate missing seats for chosen bus when bus has 0 seats', () => {
    component.onBusSelect(200); // bus 200 has capacity 4 and 0 mock seats
    expect(component.busSeats().length).toBe(0);

    component.generateSeatsForChosenBus();

    // Must call createBusSeat 4 times (seats 1, 2, 3, 4)
    expect(mockSeatService.createBusSeat).toHaveBeenCalledTimes(4);
    expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'success',
      summary: 'Seats Generated',
    }));
  });

  it('should prevent duplicate seat generation when already generating', () => {
    component.selectedBusIdForForm.set(200);
    component.generatingSeats.set(true);

    mockSeatService.createBusSeat.mockClear();
    component.generateSeatsForChosenBus();

    expect(mockSeatService.createBusSeat).not.toHaveBeenCalled();
  });

  it('should transition status via executeStatusUpdate and show success toast', () => {
    component.executeStatusUpdate(1, 'COMPLETED');

    expect(mockBookingService.updateBusBookingStatus).toHaveBeenCalledWith(1, 'COMPLETED');
    expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'success',
      summary: 'Status Updated',
    }));
  });
});
