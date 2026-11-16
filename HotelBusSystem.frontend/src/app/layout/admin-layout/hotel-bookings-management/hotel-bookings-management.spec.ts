import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { HotelBookingsManagement } from './hotel-bookings-management';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { RoomService } from '../../../core/services/room.service';
import { HotelService } from '../../../core/services/hotel.service';
import { MessageService } from 'primeng/api';
import { HotelBookingDTO } from '../../../core/models/Hotel/hotel-booking.model';
import { RoomDTO } from '../../../core/models/Room/room.model';
import { HotelDTO } from '../../../core/models/Hotel/hotel.model';
import { PageHotelBookingDTO } from '../../../core/models/Pagination/hotelBookingPage.model';

describe('HotelBookingsManagement Component', () => {
  let component: HotelBookingsManagement;
  let mockBookingService: any;
  let mockRoomService: any;
  let mockHotelService: any;
  let mockMessageService: any;

  const mockHotels: HotelDTO[] = [
    { id: 101, name: 'Grand Nile Hotel', city: 'Cairo', address: '1 Nile St', description: 'Luxury hotel', rating: 5, images: [] },
    { id: 102, name: 'Alex Beach Resort', city: 'Alexandria', address: '10 Corniche', description: 'Sea view', rating: 4, images: [] },
  ];

  const mockRoomsHotel101: RoomDTO[] = [
    { id: 1, roomNumber: '101', roomType: 'STANDARD' as any, capacity: 2, pricePerNight: 100, hotelId: 101, hotelName: 'Grand Nile Hotel' },
    { id: 2, roomNumber: '102', roomType: 'SUITE' as any, capacity: 4, pricePerNight: 200, hotelId: 101, hotelName: 'Grand Nile Hotel' },
  ];

  const mockRoomsHotel102: RoomDTO[] = [
    { id: 3, roomNumber: '201', roomType: 'DELUXE' as any, capacity: 3, pricePerNight: 150, hotelId: 102, hotelName: 'Alex Beach Resort' },
  ];

  const mockBookings: HotelBookingDTO[] = [
    {
      id: 1,
      checkIn: '2026-12-01',
      checkOut: '2026-12-05',
      guests: 3, // Server totalOccupants: 2 adults + 1 free child (age 5)
      adults: 2,
      childAges: [5],
      status: 'CONFIRMED',
      totalPrice: 400,
      userId: 10,
      roomId: 1,
      hotelId: 101,
      hotelName: 'Grand Nile Hotel',
    },
    {
      id: 2,
      checkIn: '2026-12-10',
      checkOut: '2026-12-12',
      guests: 4, // 2 adults + 1 chargeable (age 14) + 1 free (age 6)
      adults: 2,
      childAges: [14, 6],
      status: 'PENDING',
      totalPrice: 300,
      userId: 11,
      roomId: 2,
      hotelId: 101,
      hotelName: 'Grand Nile Hotel',
    },
  ];

  beforeEach(() => {
    mockBookingService = {
      getAllHotelBookings: vi.fn().mockReturnValue(
        of({
          content: mockBookings,
          totalElements: 2,
          totalPages: 1,
          size: 10,
          number: 0,
          page: { totalElements: 2, totalPages: 1, size: 10, number: 0 },
        } as PageHotelBookingDTO)
      ),
      createHotelBooking: vi.fn().mockReturnValue(of({ id: 3 })),
      updateHotelBooking: vi.fn().mockReturnValue(of({ id: 1 })),
      updateHotelBookingStatus: vi.fn().mockReturnValue(of({ id: 1, status: 'CONFIRMED' })),
      deleteHotelBooking: vi.fn().mockReturnValue(of(void 0)),
    };

    mockRoomService = {
      getAllRoomsCatalog: vi.fn().mockReturnValue(of([...mockRoomsHotel101, ...mockRoomsHotel102])),
      getAllRooms: vi.fn().mockReturnValue(of({ content: mockRoomsHotel101 })),
      getRoomsByHotelId: vi.fn().mockImplementation((hotelId: number) => {
        if (hotelId === 101) return of(mockRoomsHotel101);
        if (hotelId === 102) return of(mockRoomsHotel102);
        return of([]);
      }),
    };

    mockHotelService = {
      getAllHotels: vi.fn().mockReturnValue(of(mockHotels)),
    };

    mockMessageService = {
      add: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: HotelBookingService, useValue: mockBookingService },
        { provide: RoomService, useValue: mockRoomService },
        { provide: HotelService, useValue: mockHotelService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: FormBuilder, useClass: FormBuilder },
      ],
    });

    component = runInInjectionContext(injector, () => new HotelBookingsManagement());
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should initialize and load hotels, rooms catalog, and bookings', () => {
    component.ngOnInit();

    expect(mockHotelService.getAllHotels).toHaveBeenCalled();
    expect(mockRoomService.getAllRoomsCatalog).toHaveBeenCalled();
    expect(mockBookingService.getAllHotelBookings).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sortBy: 'id',
      sortDirection: 'desc',
      status: 'ANY',
    });
    expect(component.hotels().length).toBe(2);
    expect(component.rooms().length).toBe(3);
    expect(component.bookings().length).toBe(2);
  });

  it('should calculate minimum guests from adults + chargeable children (12-17) excluding free children (0-11)', () => {
    component.ngOnInit();

    // Booking 2 has 2 adults, 1 chargeable child (age 14), 1 free child (age 6)
    // Required capacity / minGuests = 2 + 1 = 3
    component.openEditDialog(mockBookings[1]);

    expect(component.isEditMode()).toBe(true);
    expect(component.selectedHotelId()).toBe(101);
    expect(mockRoomService.getRoomsByHotelId).toHaveBeenCalledWith(101);
    expect(component.minGuests()).toBe(3);
    expect(component.maxGuests()).toBe(4); // Room 2 capacity is 4
    expect(component.capacityError()).toBeNull();
  });

  it('should show capacity error when selected room capacity is strictly less than minimum guests', () => {
    component.ngOnInit();

    // Booking 2 minGuests is 3. Select room 1 (capacity 2)
    component.openEditDialog(mockBookings[1]);
    component.onRoomSelect(1); // Room 1 capacity = 2

    expect(component.minGuests()).toBe(3);
    expect(component.maxGuests()).toBe(2);
    expect(component.capacityError()).toContain('less than required minimum guests (3)');

    // Attempting to save should block and show error toast
    component.saveBooking();
    expect(mockBookingService.updateHotelBooking).not.toHaveBeenCalled();
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Capacity Exceeded',
      })
    );
  });

  it('should set default guests to room capacity when a room is selected and clear capacity error if valid', () => {
    component.ngOnInit();

    // Open booking 1 (minGuests = 2, room 1 capacity = 2)
    component.openEditDialog(mockBookings[0]);
    expect(component.minGuests()).toBe(2);

    // Switch to room 2 (capacity = 4)
    component.onRoomSelect(2);

    expect(component.maxGuests()).toBe(4);
    expect(component.bookingForm.value.guests).toBe(4); // default guests = capacity
    expect(component.capacityError()).toBeNull();
  });

  it('should reload rooms and clear room selection when hotel changes to one not containing the selected room', () => {
    component.ngOnInit();

    component.openEditDialog(mockBookings[0]); // Hotel 101, Room 1
    expect(component.bookingForm.value.roomId).toBe(1);

    // Change hotel to 102 (which only has room 3)
    component.onHotelChange(102);

    expect(mockRoomService.getRoomsByHotelId).toHaveBeenCalledWith(102);
    expect(component.hotelRooms().length).toBe(1);
    expect(component.hotelRooms()[0].id).toBe(3);
    expect(component.bookingForm.value.roomId).toBeNull();
    expect(component.selectedRoom()).toBeNull();
  });

  it('should reject manual guest value below minimum guests and block save', () => {
    component.ngOnInit();

    component.openEditDialog(mockBookings[1]); // minGuests = 3, room 2 capacity = 4
    component.bookingForm.patchValue({ guests: 2 }); // below minGuests 3

    component.saveBooking();

    expect(mockBookingService.updateHotelBooking).not.toHaveBeenCalled();
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        summary: 'Guest Count Out of Range',
      })
    );
  });

  it('should reject manual guest value above room capacity (maximum) and block save', () => {
    component.ngOnInit();

    component.openEditDialog(mockBookings[1]); // minGuests = 3, room 2 capacity = 4
    component.bookingForm.patchValue({ guests: 5 }); // above maxGuests 4

    component.saveBooking();

    expect(mockBookingService.updateHotelBooking).not.toHaveBeenCalled();
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        summary: 'Guest Count Out of Range',
      })
    );
  });

  it('should save valid booking in edit mode and include roomIds, calculated adults, preserved childAges, and server total guests', () => {
    component.ngOnInit();

    // Booking 0: 2 adults, 1 free child (age 5). minGuests = 2. Room 1 capacity = 2.
    component.openEditDialog(mockBookings[0]);

    // Admin selects room 2 (capacity 4). Default guests becomes 4.
    component.onRoomSelect(2);
    expect(component.bookingForm.value.guests).toBe(4);

    component.saveBooking();

    // In booking 0, chargeableChildrenCount = 0, freeChildrenCount = 1 (age 5).
    // guestVal = 4. calculatedAdults = 4 - 0 = 4.
    // server guests (total occupants) = guestVal + freeCount = 4 + 1 = 5.
    expect(mockBookingService.updateHotelBooking).toHaveBeenCalledWith(1, {
      roomId: 2,
      roomIds: [2],
      guests: 5,
      adults: 4,
      childAges: [5],
      checkIn: '2026-12-01',
      checkOut: '2026-12-05',
    });
  });
});
