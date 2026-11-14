import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { HotelsManagement } from './hotels-management';
import { HotelService } from '../../../core/services/hotel.service';
import { MessageService } from 'primeng/api';
import { HotelDTO } from '../../../core/models/Hotel/hotel.model';
import { PageHotelDTO } from '../../../core/models/Pagination/hotelPage.model';

describe('HotelsManagement Component', () => {
  let component: HotelsManagement;
  let mockHotelService: any;
  let mockMessageService: any;

  const mockHotels: HotelDTO[] = [
    {
      id: 1,
      name: 'Cairo Grand Hotel',
      city: 'Cairo',
      address: 'Corniche El Nile',
      rating: 4.8,
      latitude: 30.0444,
      longitude: 31.2357,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      description: 'Luxury hotel on the Nile',
    },
    {
      id: 2,
      name: 'Canal Breeze Resort',
      city: 'Canal Zone',
      address: 'Port Said St',
      rating: 4.2,
      latitude: 31.2001,
      longitude: 29.9187,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      description: 'Resort by the Mediterranean',
    },
    {
      id: 3,
      name: 'Giza Pyramids View',
      city: 'Giza',
      address: 'Al Haram',
      rating: 3.8,
      latitude: 29.9792,
      longitude: 31.1342,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      description: 'Overlooking the Pyramids',
    },
    {
      id: 4,
      name: 'Luxor Palace',
      city: 'Luxor',
      address: 'East Bank',
      rating: 4.6,
      latitude: 25.6872,
      longitude: 32.6396,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      description: 'Historic palace in Luxor',
    },
    {
      id: 5,
      name: 'Aswan Cataract Hotel',
      city: 'Aswan',
      address: 'Abtal El Tahrir',
      rating: 4.9,
      latitude: 24.0889,
      longitude: 32.8998,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      description: 'Legendary Cataract hotel',
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();

    mockHotelService = {
      getHotels: vi.fn().mockReturnValue(
        of({
          content: mockHotels.slice(0, 2),
          page: { totalElements: 5, totalPages: 3, size: 2, number: 0 },
        } as PageHotelDTO)
      ),
      getAllHotels: vi.fn().mockReturnValue(of(mockHotels)),
      createHotel: vi.fn().mockReturnValue(of({ id: 99, name: 'New Hotel', city: 'Cairo' })),
      updateHotel: vi.fn().mockReturnValue(of({ id: 1, name: 'Updated Cairo Grand', city: 'Cairo' })),
      deleteHotel: vi.fn().mockReturnValue(of(void 0)),
    };

    mockMessageService = {
      add: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: HotelService, useValue: mockHotelService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: FormBuilder, useClass: FormBuilder },
      ],
    });

    component = runInInjectionContext(injector, () => new HotelsManagement());
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should initialize and load hotels using server-side pagination with Spring Data 3 page metadata', () => {
    component.ngOnInit();

    expect(mockHotelService.getHotels).toHaveBeenCalledWith({
      page: 0,
      size: 10,
    });
    expect(component.hotels().length).toBe(2);
    expect(component.totalElements()).toBe(5);
    expect(component.totalPages()).toBe(3);
    expect(component.isCityFilterActive()).toBe(false);
    expect(component.displayedHotels().length).toBe(2);
  });

  it('should also read legacy totalElements if page object is flat', () => {
    mockHotelService.getHotels.mockReturnValue(
      of({
        content: mockHotels.slice(0, 2),
        totalElements: 42,
        totalPages: 5,
        size: 10,
        number: 0,
      } as PageHotelDTO)
    );

    component.loadHotels();

    expect(component.totalElements()).toBe(42);
    expect(component.totalPages()).toBe(5);
  });

  it('should request the next page from the backend when city filter is inactive', () => {
    component.ngOnInit();
    mockHotelService.getHotels.mockClear();

    component.onPageChange({ first: 10, rows: 10 });

    expect(component.currentPage()).toBe(1);
    expect(component.pageSize()).toBe(10);
    expect(mockHotelService.getHotels).toHaveBeenCalledWith({
      page: 1,
      size: 10,
    });
  });

  it('should debounce city search input by 300ms', () => {
    component.ngOnInit();
    expect(mockHotelService.getAllHotels).not.toHaveBeenCalled();

    component.onCityInput('c');
    vi.advanceTimersByTime(100);
    component.onCityInput('ca');
    vi.advanceTimersByTime(100);
    component.onCityInput('cai');

    // Not yet 300ms since last input
    expect(mockHotelService.getAllHotels).not.toHaveBeenCalled();
    expect(component.cityFilter()).toBe('');

    // Advance remaining 300ms
    vi.advanceTimersByTime(300);

    expect(component.cityFilter()).toBe('cai');
    expect(component.isCityFilterActive()).toBe(true);
    expect(mockHotelService.getAllHotels).toHaveBeenCalledTimes(1);
    expect(component.allHotelsCache()).toEqual(mockHotels);
  });

  it('should perform partial, case-insensitive city search ("c" matches Cairo and Canal Zone)', () => {
    component.ngOnInit();

    component.onCityInput('c');
    vi.advanceTimersByTime(300);

    expect(component.isCityFilterActive()).toBe(true);
    // 'Cairo' and 'Canal Zone' both contain 'c', case-insensitively
    const displayed = component.displayedHotels();
    expect(displayed.length).toBe(2);
    expect(displayed.map((h) => h.city)).toEqual(['Cairo', 'Canal Zone']);
    expect(component.totalElements()).toBe(2);
  });

  it('should match "Cairo" when typing "cai" or "CAI"', () => {
    component.ngOnInit();

    component.onCityInput('CAI');
    vi.advanceTimersByTime(300);

    const displayed = component.displayedHotels();
    expect(displayed.length).toBe(1);
    expect(displayed[0].name).toBe('Cairo Grand Hotel');
    expect(component.totalElements()).toBe(1);
  });

  it('should combine city search with search query (q)', () => {
    component.ngOnInit();

    // Set city filter to 'c' (matches Cairo, Canal Zone)
    component.onCityInput('c');
    vi.advanceTimersByTime(300);

    // Search query 'Breeze' (matches Canal Breeze Resort)
    component.onSearchInput('Breeze');
    vi.advanceTimersByTime(300);

    const displayed = component.displayedHotels();
    expect(displayed.length).toBe(1);
    expect(displayed[0].name).toBe('Canal Breeze Resort');
    expect(component.totalElements()).toBe(1);
  });

  it('should combine city search with minRating filter', () => {
    component.ngOnInit();

    component.onCityInput('c');
    vi.advanceTimersByTime(300);

    // Filter minRating: 4.5 -> Cairo (4.8) matches, Canal Zone (4.2) excluded
    component.onRatingChange('4.5');

    const displayed = component.displayedHotels();
    expect(displayed.length).toBe(1);
    expect(displayed[0].name).toBe('Cairo Grand Hotel');
  });

  it('should paginate locally without server calls when city search is active', () => {
    component.ngOnInit();

    // Mock 15 hotels matching city 'Cairo'
    const fifteenCairoHotels: HotelDTO[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `Cairo Hotel ${i + 1}`,
      city: 'Cairo',
      address: `Address ${i + 1}`,
      rating: 4.0,
      latitude: 30.0,
      longitude: 31.0,
      checkInTime: '14:00',
      checkOutTime: '11:00',
    }));
    mockHotelService.getAllHotels.mockReturnValue(of(fifteenCairoHotels));

    component.onCityInput('cairo');
    vi.advanceTimersByTime(300);

    expect(component.totalElements()).toBe(15);
    expect(component.displayedHotels().length).toBe(10); // Page 0, size 10

    mockHotelService.getHotels.mockClear();

    // Change to Page 1
    component.onPageChange({ first: 10, rows: 10 });

    expect(component.currentPage()).toBe(1);
    expect(component.displayedHotels().length).toBe(5); // 5 remaining
    expect(component.displayedHotels()[0].name).toBe('Cairo Hotel 11');
    // Ensure no backend call was made
    expect(mockHotelService.getHotels).not.toHaveBeenCalled();
  });

  it('should reset to page 0 when city filter or query changes', () => {
    component.ngOnInit();
    component.currentPage.set(2);

    component.onCityInput('giza');
    vi.advanceTimersByTime(300);

    expect(component.currentPage()).toBe(0);

    component.currentPage.set(2);
    component.onSearchInput('grand');
    vi.advanceTimersByTime(300);

    expect(component.currentPage()).toBe(0);
  });

  it('should restore server pagination when clearing city filter', () => {
    component.ngOnInit();

    component.onCityInput('cairo');
    vi.advanceTimersByTime(300);
    expect(component.isCityFilterActive()).toBe(true);

    mockHotelService.getHotels.mockClear();

    component.clearFilters();

    expect(component.cityFilter()).toBe('');
    expect(component.isCityFilterActive()).toBe(false);
    expect(mockHotelService.getHotels).toHaveBeenCalledWith({
      page: 0,
      size: 10,
    });
  });

  it('should invalidate cache when creating, updating, or deleting a hotel', () => {
    component.ngOnInit();

    // Populate cache while city filter is not active
    component.allHotelsCache.set(mockHotels);
    expect(component.allHotelsCache()).not.toBeNull();

    // Create a hotel
    component.hotelForm.patchValue({
      name: 'New Hotel',
      city: 'Cairo',
      address: 'Street 1',
      rating: 4.5,
      latitude: 30,
      longitude: 31,
      checkInTime: '14:00',
      checkOutTime: '11:00',
    });
    component.isEditMode.set(false);
    component.saveHotel();

    expect(mockHotelService.createHotel).toHaveBeenCalled();
    // Cache was invalidated (and since city filter was not active, it stays null)
    expect(component.allHotelsCache()).toBeNull();

    // Repopulate cache
    component.allHotelsCache.set(mockHotels);
    expect(component.allHotelsCache()).not.toBeNull();

    // Edit a hotel
    component.isEditMode.set(true);
    component.editingHotelId.set(1);
    component.saveHotel();

    expect(mockHotelService.updateHotel).toHaveBeenCalled();
    expect(component.allHotelsCache()).toBeNull();

    // Repopulate cache
    component.allHotelsCache.set(mockHotels);
    expect(component.allHotelsCache()).not.toBeNull();

    // Delete a hotel
    component.hotelToDelete.set(mockHotels[0]);
    component.executeDelete();

    expect(mockHotelService.deleteHotel).toHaveBeenCalledWith(1);
    expect(component.allHotelsCache()).toBeNull();
  });
});

