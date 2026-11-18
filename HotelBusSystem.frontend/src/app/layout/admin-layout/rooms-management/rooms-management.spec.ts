import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { RoomsManagement } from './rooms-management';
import { RoomService } from '../../../core/services/room.service';
import { HotelService } from '../../../core/services/hotel.service';
import { MessageService } from 'primeng/api';
import { RoomDTO } from '../../../core/models/Room/room.model';
import { PagedModelRoomDto } from '../../../core/models/Pagination/roomPage.model';

describe('RoomsManagement Component', () => {
  let component: RoomsManagement;
  let mockRoomService: any;
  let mockHotelService: any;
  let mockMessageService: any;

  const mockRooms: RoomDTO[] = [
    {
      id: 1,
      roomNumber: '101-A',
      roomType: 'SINGLE',
      capacity: 1,
      pricePerNight: 120,
      hotelId: 10,
      hotelName: 'Nile Grand Palace',
    },
    {
      id: 2,
      roomNumber: '202-B',
      roomType: 'DOUBLE',
      capacity: 2,
      pricePerNight: 200,
      hotelId: 10,
      hotelName: 'Nile Grand Palace',
    },
    {
      id: 3,
      roomNumber: '303-C',
      roomType: 'SUITE',
      capacity: 4,
      pricePerNight: 450,
      hotelId: 20,
      hotelName: 'Red Sea Resort',
    },
    {
      id: 4,
      roomNumber: '404-D',
      roomType: 'DELUXE',
      capacity: 3,
      pricePerNight: 350,
      hotelId: 20,
      hotelName: 'Red Sea Resort',
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();

    mockRoomService = {
      getAllRooms: vi.fn().mockReturnValue(
        of({
          content: mockRooms.slice(0, 2),
          totalElements: 4,
          totalPages: 2,
          size: 2,
          number: 0,
          page: { totalElements: 4, totalPages: 2, size: 2, number: 0 },
        } as PagedModelRoomDto)
      ),
      getAllRoomsCatalog: vi.fn().mockReturnValue(of(mockRooms)),
      createRoom: vi.fn().mockReturnValue(of({ id: 5, roomNumber: '505-E' })),
      updateRoom: vi.fn().mockReturnValue(of({ id: 1, roomNumber: '101-UP' })),
      deleteRoom: vi.fn().mockReturnValue(of(void 0)),
    };

    mockHotelService = {
      lookupHotels: vi.fn().mockReturnValue(of([])),
      getAllHotels: vi.fn().mockReturnValue(of([])),
    };

    mockMessageService = {
      add: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: RoomService, useValue: mockRoomService },
        { provide: HotelService, useValue: mockHotelService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: FormBuilder, useClass: FormBuilder },
      ],
    });

    component = runInInjectionContext(injector, () => new RoomsManagement());
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should initialize and load rooms with server-side pagination and Spring Data page metadata', () => {
    component.ngOnInit();

    expect(mockRoomService.getAllRooms).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: 'id,asc',
    });
    // Does not call hotel service only to display names
    expect(mockHotelService.lookupHotels).not.toHaveBeenCalled();

    expect(component.rooms().length).toBe(2);
    expect(component.totalElements()).toBe(4);
    expect(component.displayedRooms().length).toBe(2);
    expect(component.isFilterActive()).toBe(false);
  });

  it('should read hotelName directly from RoomDTO and build availableHotels and availableRoomTypes dynamically', () => {
    component.ngOnInit();

    expect(component.rooms()[0].hotelName).toBe('Nile Grand Palace');

    // Available hotels extracted from loaded rooms
    const hotelOptions = component.availableHotels();
    expect(hotelOptions.length).toBe(1);
    expect(hotelOptions[0].name).toBe('Nile Grand Palace');

    // Available room types extracted from loaded rooms
    const typeOptions = component.availableRoomTypes();
    expect(typeOptions).toEqual(['DOUBLE', 'SINGLE']);
  });

  it('should debounce search input by 300ms, fetch catalog, and perform partial case-insensitive search across displayed fields', () => {
    component.ngOnInit();

    // Partial search on hotelName
    component.onSearchInput('red sea');
    vi.advanceTimersByTime(200);
    expect(mockRoomService.getAllRoomsCatalog).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(component.isFilterActive()).toBe(true);
    expect(mockRoomService.getAllRoomsCatalog).toHaveBeenCalledTimes(1);

    const displayed = component.displayedRooms();
    expect(displayed.length).toBe(2);
    expect(displayed.every((r) => r.hotelName === 'Red Sea Resort')).toBe(true);
    expect(component.totalElements()).toBe(2);
  });

  it('should match search query on price as text or room type', () => {
    component.ngOnInit();

    // Search by price
    component.onSearchInput('450');
    vi.advanceTimersByTime(300);

    let displayed = component.displayedRooms();
    expect(displayed.length).toBe(1);
    expect(displayed[0].roomNumber).toBe('303-C');

    // Search by room type
    component.onSearchInput('deluxe');
    vi.advanceTimersByTime(300);

    displayed = component.displayedRooms();
    expect(displayed.length).toBe(1);
    expect(displayed[0].roomNumber).toBe('404-D');
  });

  it('should filter by hotel and room type dropdown and reset page to 0', () => {
    component.ngOnInit();
    component.currentPage.set(1);

    component.onHotelChange('20');
    expect(component.currentPage()).toBe(0);
    expect(component.selectedHotelId()).toBe(20);

    const displayed = component.displayedRooms();
    expect(displayed.length).toBe(2);
    expect(displayed.every((r) => r.hotelId === 20)).toBe(true);

    component.onRoomTypeChange('DELUXE');
    expect(component.roomTypeFilter()).toBe('DELUXE');

    const filtered = component.displayedRooms();
    expect(filtered.length).toBe(1);
    expect(filtered[0].roomNumber).toBe('404-D');
  });

  it('should reset all filters and restore full list on clearFilters', () => {
    component.ngOnInit();
    component.searchQuery.set('suite');
    component.selectedHotelId.set(20);
    component.roomTypeFilter.set('SUITE');
    component.currentPage.set(2);
    mockRoomService.getAllRooms.mockClear();

    component.clearFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.selectedHotelId()).toBeNull();
    expect(component.roomTypeFilter()).toBe('');
    expect(component.currentPage()).toBe(0);
    expect(mockRoomService.getAllRooms).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: 'id,asc',
    });
  });

  it('should request the correct page on page change when filters are inactive', () => {
    component.ngOnInit();
    mockRoomService.getAllRooms.mockClear();

    component.onPageChange({ first: 10, rows: 10 });

    expect(component.currentPage()).toBe(1);
    expect(mockRoomService.getAllRooms).toHaveBeenCalledWith({
      page: 1,
      size: 10,
      sort: 'id,asc',
    });
  });

  it('should ensure all room IDs across pages are distinct with zero duplicates', () => {
    component.ngOnInit();
    component.onSearchInput('room');
    vi.advanceTimersByTime(300);

    const all = component.filteredRooms();
    const ids = all.map((r) => r.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should invalidate cache when creating, updating, or deleting a room', () => {
    component.ngOnInit();
    component.allRoomsCache.set(mockRooms);

    // Create room
    component.roomForm.patchValue({
      roomNumber: '999',
      hotelId: 10,
      hotelName: 'Nile Grand Palace',
      roomType: 'SINGLE',
      capacity: 2,
      pricePerNight: 100,
    });
    component.isEditMode.set(false);
    component.saveRoom();

    expect(mockRoomService.createRoom).toHaveBeenCalled();
    expect(component.allRoomsCache()).toBeNull();

    // Update room
    component.allRoomsCache.set(mockRooms);
    component.isEditMode.set(true);
    component.editingRoomId.set(1);
    component.saveRoom();

    expect(mockRoomService.updateRoom).toHaveBeenCalled();
    expect(component.allRoomsCache()).toBeNull();

    // Delete room
    component.allRoomsCache.set(mockRooms);
    component.roomToDelete.set(mockRooms[0]);
    component.confirmDeleteRoom();

    expect(mockRoomService.deleteRoom).toHaveBeenCalledWith(1);
    expect(component.allRoomsCache()).toBeNull();
  });

  it('loads full hotel catalog on init so filter and dialog display all hotels', () => {
    const fullHotels = [
      { id: 99, name: 'Zanzibar Inn', city: 'Alexandria' },
      { id: 10, name: 'Alex Resort', city: 'Alexandria' },
    ];
    mockHotelService.getAllHotels.mockReturnValue(of(fullHotels));

    component.ngOnInit();

    expect(mockHotelService.getAllHotels).toHaveBeenCalled();
    expect(component.hotels()).toEqual(fullHotels);
    // availableHotels is sorted alphabetically
    expect(component.availableHotels()).toEqual([
      { id: 10, name: 'Alex Resort' },
      { id: 99, name: 'Zanzibar Inn' },
    ]);
  });
});

