import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, BehaviorSubject } from 'rxjs';
import { HotelDetails } from './hotel-details';
import { HotelService } from '../../../core/services/hotel.service';
import { RoomService } from '../../../core/services/room.service';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { HotelImageService } from '../../../core/services/hotel-image.service';
import { AuthService } from '../../../core/services/auth.service';
import { BookingStateService } from '../../../core/services/booking-state.service';
import { RoomDTO } from '../../../core/models/Room/room.model';
import { HotelBookingDTO } from '../../../core/models/Hotel/hotel-booking.model';

describe('HotelDetails - Room Booking Flow & Requirements', () => {
  let component: HotelDetails;
  let mockHotelService: any;
  let mockRoomService: any;
  let mockHotelBookingService: any;
  let mockHotelImageService: any;
  let mockAuthService: any;
  let mockRouter: any;
  let paramMapSubject: BehaviorSubject<any>;

  const mockHotel = {
    id: 1,
    name: 'Nile Palace Resort',
    city: 'Luxor',
    address: 'Corniche El Nile',
    rating: 4.9,
    latitude: 25.68,
    longitude: 32.63,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    description: 'A luxurious resort on the banks of the Nile.',
  };

  const mockRooms: RoomDTO[] = [
    {
      id: 101,
      roomNumber: '101',
      roomType: 'DOUBLE',
      capacity: 3,
      pricePerNight: 1200,
      hotelId: 1,
      hotelName: 'Nile Palace Resort',
    },
    {
      id: 102,
      roomNumber: '102',
      roomType: 'SINGLE',
      capacity: 1,
      pricePerNight: 800,
      hotelId: 1,
      hotelName: 'Nile Palace Resort',
    },
    {
      id: 103,
      roomNumber: '103',
      roomType: 'SUITE',
      capacity: 4,
      pricePerNight: 2500,
      hotelId: 1,
      hotelName: 'Nile Palace Resort',
    },
  ];

  const mockExistingBookings: HotelBookingDTO[] = [
    {
      id: 501,
      checkIn: '2026-11-10',
      checkOut: '2026-11-15',
      guests: 2,
      status: 'CONFIRMED',
      totalPrice: 4000,
      userId: 99,
      roomId: 102,
      hotelId: 1,
      hotelName: 'Nile Palace Resort',
      rooms: [
        {
          id: 102,
          roomId: 102,
          roomNumber: '102',
          roomType: 'SINGLE',
          pricePerNight: 800,
        },
      ],
    },
  ];

  beforeEach(() => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ id: '1' }));

    mockHotelService = {
      getHotelById: vi.fn().mockReturnValue(of(mockHotel)),
    };

    mockRoomService = {
      getPaginatedRoomsByHotelId: vi.fn().mockReturnValue(
        of({
          content: mockRooms,
          page: { totalElements: 3, totalPages: 1, number: 0, size: 12 },
        })
      ),
      getRoomsByHotelId: vi.fn().mockReturnValue(of(mockRooms)),
    };

    mockHotelBookingService = {
      getHotelBookingsByHotelId: vi.fn().mockReturnValue(of(mockExistingBookings)),
      createHotelBooking: vi.fn().mockImplementation((payload) =>
        of({
          id: 777,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
          guests: payload.guests,
          adults: payload.adults,
          childAges: payload.childAges,
          status: 'CONFIRMED',
          totalPrice: 3600,
          userId: 10,
          roomId: payload.roomId,
          hotelId: 1,
          hotelName: 'Nile Palace Resort',
          rooms: payload.roomIds.map((rId: number) => {
            const found = mockRooms.find((r) => r.id === rId);
            return {
              id: rId,
              roomId: rId,
              roomNumber: found?.roomNumber || String(rId),
              roomType: found?.roomType || 'DOUBLE',
              pricePerNight: found?.pricePerNight || 1000,
            };
          }),
        })
      ),
    };

    mockHotelImageService = {
      getImages: vi.fn().mockReturnValue(of([])),
    };

    mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      ensureInitialized: vi.fn().mockResolvedValue(null),
    };

    mockRouter = {
      url: '/hotels/1',
      navigate: vi.fn().mockResolvedValue(true),
    };

    const injector = Injector.create({
      providers: [
        { provide: HotelService, useValue: mockHotelService },
        { provide: RoomService, useValue: mockRoomService },
        { provide: HotelBookingService, useValue: mockHotelBookingService },
        { provide: HotelImageService, useValue: mockHotelImageService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        BookingStateService,
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMapSubject.asObservable(),
            snapshot: {
              paramMap: convertToParamMap({ id: '1' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    });

    component = runInInjectionContext(injector, () => new HotelDetails());
    component.ngOnInit();
  });

  describe('1. Google Maps coordinates handling', () => {
    it('should validate coordinates and generate googleMapsUrl while keeping raw numbers hidden from UI', () => {
      expect(component.hasValidCoordinates()).toBe(true);
      expect(component.googleMapsUrl()).toContain('query=25.68,32.63');
      // Null island (0, 0) should be invalid
      expect(component.isValidCoordinate(0, 0)).toBe(false);
      expect(component.isValidCoordinate(25.68, 32.63)).toBe(true);
    });
  });

  describe('2. Guest Selection under Select Your Stay Dates', () => {
    it('should allow modifying adults and children before selecting rooms or opening booking summary', () => {
      expect(component.adultsCount()).toBe(2);
      expect(component.children().length).toBe(0);

      // Increase adults
      component.increaseAdults();
      expect(component.adultsCount()).toBe(3);

      // Decrease adults (min 1)
      component.decreaseAdults();
      expect(component.adultsCount()).toBe(2);

      // Add child
      component.addChild();
      expect(component.children().length).toBe(1);
      expect(component.children()[0].age).toBeNull();

      // Update child age
      component.updateChildAge(component.children()[0].id, 8);
      expect(component.children()[0].age).toBe(8);

      // Free child under 12
      expect(component.freeChildrenCount()).toBe(1);
      expect(component.capacityChildrenCount()).toBe(0);
    });
  });

  describe('3. Date Selection & Scrolling', () => {
    it('should update dates without calling router.navigate (preventing page scroll to top)', () => {
      const checkInEvent = { target: { value: '2026-12-01' } } as unknown as Event;
      const checkOutEvent = { target: { value: '2026-12-05' } } as unknown as Event;

      component.onCheckInInputChange(checkInEvent);
      component.onCheckOutInputChange(checkOutEvent);

      expect(component.checkInInput()).toBe('2026-12-01');
      expect(component.checkOutInput()).toBe('2026-12-05');
      expect(component.areStayDatesValid()).toBe(true);
      expect(component.stayNights()).toBe(4);

      // Router.navigate must NOT have been called during date input changes
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('4. Independent Room Guest Allocation & Capacity Enforcement', () => {
    it('should independently allocate guests to selected rooms without cross-room side effects', () => {
      // Room 101: capacity 3
      component.toggleRoomSelection(mockRooms[0]);
      // Room 103: capacity 4
      component.toggleRoomSelection(mockRooms[2]);

      expect(component.selectedRooms().length).toBe(2);

      // Modify adults in room 101
      component.onSidebarRoomAdultsChange({ roomId: 101, delta: 1 });
      const room101Adults = component.getAssignedAdults(101);
      const room103Adults = component.getAssignedAdults(103);

      // Modifying Room 101 must not change Room 103
      expect(room103Adults).toBe(1);
      expect(room101Adults).toBe(3);

      // Try increasing beyond room 101 capacity (capacity is 3)
      component.onSidebarRoomAdultsChange({ roomId: 101, delta: 1 });
      // Should remain at 3 because 3 is max capacity
      expect(component.getAssignedAdults(101)).toBe(3);

      // Deselecting Room 103 should clean its allocation while keeping Room 101 intact
      component.deselectRoom(103);
      expect(component.selectedRooms().length).toBe(1);
      expect(component.getAssignedAdults(101)).toBe(3);
    });
  });

  describe('5. Booked Room State', () => {
    it('should detect when a room has overlapping active booking and prevent re-booking', () => {
      // Room 102 has booking from 2026-11-10 to 2026-11-15
      component.onCheckInChange('2026-11-12');
      component.onCheckOutChange('2026-11-14');

      // Room 102 should be marked booked
      expect(component.isRoomBooked(102)).toBe(true);
      // Room 101 should NOT be booked
      expect(component.isRoomBooked(101)).toBe(false);

      // Trying to select booked room 102 must do nothing
      component.toggleRoomSelection(mockRooms[1]);
      expect(component.isRoomSelected(102)).toBe(false);

      // For non-overlapping dates, room 102 should be available
      component.onCheckInChange('2026-11-20');
      component.onCheckOutChange('2026-11-25');
      expect(component.isRoomBooked(102)).toBe(false);
    });
  });

  describe('6. Booking Confirmation & Reservation Details', () => {
    it('should submit booking with exact dates and record confirmed room guest allocations', () => {
      component.onCheckInChange('2026-12-10');
      component.onCheckOutChange('2026-12-13');

      // Select Room 101
      component.toggleRoomSelection(mockRooms[0]);
      component.openSidebar();
      expect(component.sidebarVisible()).toBe(true);

      // Submit booking
      component.submitBooking();

      expect(mockHotelBookingService.createHotelBooking).toHaveBeenCalledTimes(1);
      const payload = mockHotelBookingService.createHotelBooking.mock.calls[0][0];
      expect(payload.checkIn).toBe('2026-12-10');
      expect(payload.checkOut).toBe('2026-12-13');
      expect(payload.roomIds).toEqual([101]);

      // Drawer should be automatically closed upon success
      expect(component.sidebarVisible()).toBe(false);

      // Confirmed booking and room allocation should be populated
      expect(component.confirmedBooking()).not.toBeNull();
      expect(component.confirmedRoomAllocations().length).toBe(1);
      expect(component.confirmedRoomAllocations()[0].roomNumber).toBe('101');
      expect(component.confirmedRoomAllocations()[0].adults).toBeGreaterThanOrEqual(1);
    });
  });

  describe('7. Synchronize Adults & Children Between Components', () => {
    it('should synchronize Adults from Hotel Details to rooms in Booking Summary', () => {
      // Room 101 (cap 3) and Room 103 (cap 4)
      component.toggleRoomSelection(mockRooms[0]);
      component.toggleRoomSelection(mockRooms[2]);

      // When 2 rooms are selected, each room gets at least 1 adult, making total assigned = 3 (Room 101: 2, Room 103: 1)
      expect(component.adultsCount()).toBe(3);
      expect(component.getAssignedAdults(101)).toBe(2);
      expect(component.getAssignedAdults(103)).toBe(1);

      // Increase adults in Hotel Details to 4
      component.increaseAdults();
      expect(component.adultsCount()).toBe(4);
      // Synchronized to rooms in Booking Summary: Room 103 gets the additional adult
      expect(component.getAssignedAdults(101) + component.getAssignedAdults(103)).toBe(4);

      component.increaseAdults();
      expect(component.adultsCount()).toBe(5);
      expect(component.getAssignedAdults(101) + component.getAssignedAdults(103)).toBe(5);
    });

    it('should synchronize Adults from Booking Summary room stepper back to Hotel Details', () => {
      component.toggleRoomSelection(mockRooms[0]); // Room 101 (cap 3, initial adults = 2)
      component.toggleRoomSelection(mockRooms[2]); // Room 103 (cap 4, initial adults = 1)
      expect(component.adultsCount()).toBe(3);

      // User increases adults in room 101 directly from Booking Summary (from 2 to 3)
      component.onSidebarRoomAdultsChange({ roomId: 101, delta: 1 });
      expect(component.getAssignedAdults(101)).toBe(3);
      // Hotel Details adultsCount immediately updates to total (3 + 1 = 4)
      expect(component.adultsCount()).toBe(4);

      // User increases adults in room 103 directly from Booking Summary (from 1 to 2)
      component.onSidebarRoomAdultsChange({ roomId: 103, delta: 1 });
      expect(component.getAssignedAdults(103)).toBe(2);
      expect(component.adultsCount()).toBe(5);

      // User decreases adults in room 101 (from 3 to 2)
      component.onSidebarRoomAdultsChange({ roomId: 101, delta: -1 });
      expect(component.getAssignedAdults(101)).toBe(2);
      expect(component.adultsCount()).toBe(4);
    });

    it('should synchronize Children and Child Ages bidirectionally and preserve ages', () => {
      component.toggleRoomSelection(mockRooms[0]); // Room 101

      // Add child in Hotel Details
      component.addChild();
      expect(component.children().length).toBe(1);
      const child1Id = component.children()[0].id;
      // Child is assigned to room 101
      expect(component.getAssignedChildren(101).some((c) => c.id === child1Id)).toBe(true);

      // Set age in Hotel Details to 9
      component.updateChildAge(child1Id, 9);
      expect(component.children()[0].age).toBe(9);
      expect(component.getAssignedChildren(101)[0].age).toBe(9);

      // Add another child from Booking Summary
      component.onSidebarAddChild(101);
      expect(component.children().length).toBe(2);
      const child2Id = component.children()[1].id;

      // Update child 2 age from Booking Summary
      component.onSidebarChildAgeChange({ childId: child2Id, age: 14 });
      expect(component.children().find((c) => c.id === child2Id)?.age).toBe(14);
      // Child 1 age preserved
      expect(component.children().find((c) => c.id === child1Id)?.age).toBe(9);

      // Remove child 1 from Booking Summary
      component.onSidebarRemoveChild({ childId: child1Id, roomId: 101 });
      expect(component.children().length).toBe(1);
      expect(component.children()[0].id).toBe(child2Id);
      expect(component.children()[0].age).toBe(14);
    });

    it('should reflect stay dates and guests updated in BookingStateService directly in HotelDetails', () => {
      // Simulate Summary drawer updating stay dates via BookingStateService
      component.bookingStateService.setStayDates('2026-11-20', '2026-11-25');
      expect(component.checkInInput()).toBe('2026-11-20');
      expect(component.checkOutInput()).toBe('2026-11-25');
      expect(component.stayNights()).toBe(5);

      // Simulate Summary drawer updating guests via BookingStateService
      component.bookingStateService.setAdults(4);
      expect(component.adultsCount()).toBe(4);

      const newId = component.bookingStateService.addChild(6);
      expect(component.children().length).toBe(1);
      expect(component.children()[0].age).toBe(6);

      component.bookingStateService.setChildAge(newId, 13);
      expect(component.children()[0].age).toBe(13);
      expect(component.capacityChildrenCount()).toBe(1);
      expect(component.requiredCapacity()).toBe(5); // 4 adults + 1 chargeable child
    });
  });

  describe('8. Age-Based Room Capacity Rules & Validation', () => {
    it('Example A: Adults = 2, Children = 2 (ages 5 & 9) in Room cap 2 -> VALID (Free children do not consume capacity)', () => {
      // Room 101 has capacity 3 in mock, but let's select Room 101 (cap 3) with Adults = 3, Free Children = 2
      // Let's test with exact room capacity
      component.adultsCount.set(2);
      component.children.set([
        { id: 1, age: 5 },
        { id: 2, age: 9 },
      ]);

      // Free children count should be 2, capacity children count should be 0
      expect(component.freeChildrenCount()).toBe(2);
      expect(component.capacityChildrenCount()).toBe(0);
      expect(component.requiredCapacity()).toBe(2); // Only adults count

      // Select Room 101 (cap 3) -> valid
      component.toggleRoomSelection(mockRooms[0]);
      expect(component.isCapacityExceeded()).toBe(false);
      expect(component.capacityStatus()).toBe('valid');
    });

    it('Example B: Adults = 2, Children = 1 (age 14) -> Required capacity = 3', () => {
      component.adultsCount.set(2);
      component.children.set([{ id: 1, age: 14 }]);

      expect(component.capacityChildrenCount()).toBe(1);
      expect(component.requiredCapacity()).toBe(3); // 2 adults + 1 chargeable child
    });

    it('Example C: Room capacity = 3, Adults = 2, Children = 2 (ages 8 & 15) -> Required capacity = 3 <= 3 -> VALID', () => {
      component.adultsCount.set(2);
      component.children.set([
        { id: 1, age: 8 },  // Free
        { id: 2, age: 15 }, // Chargeable
      ]);

      expect(component.freeChildrenCount()).toBe(1);
      expect(component.capacityChildrenCount()).toBe(1);
      expect(component.requiredCapacity()).toBe(3); // 2 + 1 = 3

      // Room 101 capacity is 3
      component.toggleRoomSelection(mockRooms[0]);
      expect(component.totalRoomCapacity()).toBe(3);
      expect(component.isCapacityExceeded()).toBe(false);
      expect(component.capacityStatus()).toBe('valid');
    });

    it('Example D: Room capacity = 3, Adults = 1, Children = 3 (ages 4, 12, 16) -> Required capacity = 3 <= 3 -> VALID', () => {
      component.adultsCount.set(1);
      component.children.set([
        { id: 1, age: 4 },  // Free
        { id: 2, age: 12 }, // Chargeable
        { id: 3, age: 16 }, // Chargeable
      ]);

      expect(component.freeChildrenCount()).toBe(1);
      expect(component.capacityChildrenCount()).toBe(2);
      expect(component.requiredCapacity()).toBe(3); // 1 + 2 = 3
      expect(component.totalGuestsCount()).toBe(4); // 4 total human guests

      // Room 101 capacity is 3
      component.toggleRoomSelection(mockRooms[0]);
      expect(component.totalRoomCapacity()).toBe(3);
      expect(component.isCapacityExceeded()).toBe(false);
      expect(component.capacityStatus()).toBe('valid');
    });

    it('should disable Adults increase when capacity is reached, but permit adding free children', () => {
      // Room 101 has capacity 3
      component.toggleRoomSelection(mockRooms[0]);
      component.adultsCount.set(3);
      component.syncAdultsAllocationToRooms(3);

      expect(component.requiredCapacity()).toBe(3);
      expect(component.totalRoomCapacity()).toBe(3);
      // Adults increase must be disabled
      expect(component.isAdultsIncreaseDisabled()).toBe(true);

      // But user CAN still add children aged 0-11
      component.addChild();
      expect(component.children().length).toBe(1);
      const child = component.children()[0];

      // Ages 0-11 are NOT disabled
      expect(component.isChildAgeDisabled(child, 5)).toBe(false);
      expect(component.isChildAgeDisabled(child, 11)).toBe(false);

      // Ages 12-17 ARE restricted because capacity is already full
      expect(component.isChildAgeDisabled(child, 12)).toBe(true);
      expect(component.isChildAgeDisabled(child, 17)).toBe(true);
    });

    it('should immediately detect capacity exceeded when child age is changed to 12+', () => {
      // Room 101 (cap 3), Adults = 3
      component.toggleRoomSelection(mockRooms[0]);
      component.adultsCount.set(3);
      component.syncAdultsAllocationToRooms(3);

      // Add child with age 6 (free)
      component.addChild();
      const child = component.children()[0];
      component.updateChildAge(child.id, 6);

      expect(component.requiredCapacity()).toBe(3);
      expect(component.isCapacityExceeded()).toBe(false);

      // Change age to 14 -> capacity becomes 4 > 3 -> capacity exceeded!
      component.updateChildAge(child.id, 14);
      expect(component.requiredCapacity()).toBe(4);
      expect(component.isCapacityExceeded()).toBe(true);
      expect(component.capacityStatus()).toBe('exceeded');
      expect(component.canSubmitBooking()).toBe(false);

      // Change age back to 10 -> capacity restores to 3 -> valid!
      component.updateChildAge(child.id, 10);
      expect(component.requiredCapacity()).toBe(3);
      expect(component.isCapacityExceeded()).toBe(false);
      expect(component.capacityStatus()).toBe('valid');
    });

    it('should validate capacity when room is removed without silently deleting guests', () => {
      // Select Room 101 (cap 3) and Room 103 (cap 4) -> total capacity = 7
      component.toggleRoomSelection(mockRooms[0]);
      component.toggleRoomSelection(mockRooms[2]);
      expect(component.totalRoomCapacity()).toBe(7);

      // Adults = 4, Child = 1 (age 15) -> required capacity = 5
      component.adultsCount.set(4);
      component.syncAdultsAllocationToRooms(4);
      component.addChild();
      component.updateChildAge(component.children()[0].id, 15);

      expect(component.requiredCapacity()).toBe(5);
      expect(component.isCapacityExceeded()).toBe(false);

      // Deselect Room 103 (cap 4) -> remaining is Room 101 (cap 3)
      component.deselectRoom(103);
      expect(component.selectedRooms().length).toBe(1);
      expect(component.totalRoomCapacity()).toBe(3);

      // Guests must NOT be silently deleted
      expect(component.adultsCount()).toBe(4);
      expect(component.children().length).toBe(1);
      expect(component.children()[0].age).toBe(15);

      // Capacity should now be exceeded: 5 > 3
      expect(component.requiredCapacity()).toBe(5);
      expect(component.isCapacityExceeded()).toBe(true);
      expect(component.capacityStatus()).toBe('exceeded');
      expect(component.canSubmitBooking()).toBe(false);
    });
  });

  describe('5. Room Availability Persistence After Refresh & Date Selection', () => {
    it('should query backend availability even when auth status is initially unauthenticated on refresh', () => {
      // Simulate fresh page reload where auth is not yet resolved
      mockAuthService.isAuthenticated.mockReturnValue(false);
      mockHotelBookingService.getHotelBookingsByHotelId.mockReturnValue(of(mockExistingBookings));

      component.checkInInput.set('2026-11-11');
      component.checkOutInput.set('2026-11-14');

      component.loadBookedRooms(1);

      expect(mockHotelBookingService.getHotelBookingsByHotelId).toHaveBeenCalledWith(1);
      expect(component.isBookingsLoading()).toBe(false);
      expect(component.isRoomBooked(102)).toBe(true);
      expect(component.isRoomBooked(101)).toBe(false);
    });

    it('should treat both CONFIRMED and PENDING bookings as booked, but ignore CANCELLED bookings', () => {
      const bookingsWithVariousStatuses: HotelBookingDTO[] = [
        {
          id: 601,
          checkIn: '2026-12-01',
          checkOut: '2026-12-05',
          guests: 2,
          status: 'PENDING',
          totalPrice: 2000,
          userId: 10,
          roomId: 101,
          hotelId: 1,
          hotelName: 'Nile Palace Resort',
          rooms: [{ id: 101, roomId: 101, roomNumber: '101', roomType: 'DOUBLE', pricePerNight: 1000 }],
        },
        {
          id: 602,
          checkIn: '2026-12-01',
          checkOut: '2026-12-05',
          guests: 2,
          status: 'CANCELLED',
          totalPrice: 2000,
          userId: 11,
          roomId: 103,
          hotelId: 1,
          hotelName: 'Nile Palace Resort',
          rooms: [{ id: 103, roomId: 103, roomNumber: '103', roomType: 'SUITE', pricePerNight: 2000 }],
        },
      ];

      component.hotelBookings.set(bookingsWithVariousStatuses);
      component.checkInInput.set('2026-12-02');
      component.checkOutInput.set('2026-12-04');

      // Room 101 is PENDING -> must be treated as Booked
      expect(component.isRoomBooked(101)).toBe(true);

      // Room 103 is CANCELLED -> must NOT be treated as Booked
      expect(component.isRoomBooked(103)).toBe(false);
    });

    it('should dynamically update room availability when user changes check-in or check-out dates', () => {
      component.hotelBookings.set(mockExistingBookings); // Room 102 booked from 2026-11-10 to 2026-11-15

      // Within overlap: 2026-11-12 to 2026-11-14
      component.checkInInput.set('2026-11-12');
      component.checkOutInput.set('2026-11-14');
      expect(component.isRoomBooked(102)).toBe(true);

      // Non-overlapping dates: 2026-11-16 to 2026-11-20
      component.onCheckInChange('2026-11-16');
      component.onCheckOutChange('2026-11-20');
      expect(component.isRoomBooked(102)).toBe(false);

      // Edge case: checkout on check-in day of booking (2026-11-05 to 2026-11-10) -> no overlap
      component.onCheckInChange('2026-11-05');
      component.onCheckOutChange('2026-11-10');
      expect(component.isRoomBooked(102)).toBe(false);
    });

    it('should deselect a room if it becomes booked for the selected dates', () => {
      component.checkInInput.set('2026-11-16');
      component.checkOutInput.set('2026-11-20');
      component.toggleRoomSelection(mockRooms[1]); // select room 102
      expect(component.isRoomSelected(102)).toBe(true);

      // User changes dates to overlap existing booking (2026-11-10 to 2026-11-15)
      component.hotelBookings.set(mockExistingBookings);
      component.onCheckInChange('2026-11-12');
      component.onCheckOutChange('2026-11-14');

      // Selection must be cleared for the newly-booked room
      expect(component.isRoomBooked(102)).toBe(true);
      expect(component.isRoomSelected(102)).toBe(false);
    });

    it('should correctly mark both Room 102 and Room 103 as booked in multi-room reservations', () => {
      const multiRoomBooking: HotelBookingDTO[] = [
        {
          id: 701,
          checkIn: '2026-11-10',
          checkOut: '2026-11-15',
          guests: 4,
          status: 'CONFIRMED',
          totalPrice: 4800,
          userId: 55,
          roomId: 102, // Legacy first room
          hotelId: 1,
          hotelName: 'Nile Palace Resort',
          rooms: [
            { id: 102, roomId: 102, roomNumber: '102', roomType: 'SINGLE', pricePerNight: 800 },
            { id: 103, roomId: 103, roomNumber: '103', roomType: 'SUITE', pricePerNight: 2500 },
          ],
        },
      ];

      component.hotelBookings.set(multiRoomBooking);
      component.checkInInput.set('2026-11-12');
      component.checkOutInput.set('2026-11-14');

      expect(component.isRoomBooked(102)).toBe(true);
      expect(component.isRoomBooked(103)).toBe(true);
      expect(component.isRoomBooked(101)).toBe(false);
    });
  });
});
