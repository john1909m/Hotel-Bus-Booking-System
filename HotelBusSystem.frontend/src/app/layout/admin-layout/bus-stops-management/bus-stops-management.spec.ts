import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { BusStopsManagement } from './bus-stops-management';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { MessageService } from 'primeng/api';
import { BusStopDto } from '../../../core/models/Bus/bus-stop.model';
import { PageBusStopDTO } from '../../../core/models/Pagination/busStopPage.model';

describe('BusStopsManagement Component', () => {
  let component: BusStopsManagement;
  let mockBusStopService: any;
  let mockMessageService: any;

  const mockStops: BusStopDto[] = [
    { id: 1, name: 'Tahrir Square Hub', city: 'Cairo', address: 'Tahrir Square', latitude: 30.0444, longitude: 31.2357 },
    { id: 2, name: 'Canal Central', city: 'Canal Zone', address: 'Port Said St', latitude: 31.2, longitude: 29.9 },
    { id: 3, name: 'Giza Metro Stop', city: 'Giza', address: 'Al Haram', latitude: 29.9, longitude: 31.1 },
    { id: 4, name: 'Alex Station', city: 'Alexandria', address: 'Corniche', latitude: 31.1, longitude: 29.8 },
  ];

  beforeEach(() => {
    vi.useFakeTimers();

    mockBusStopService = {
      getAllBusStops: vi.fn().mockReturnValue(
        of({
          content: mockStops.slice(0, 2),
          totalElements: 4,
          totalPages: 2,
          size: 2,
          number: 0,
          page: { totalElements: 4, totalPages: 2, size: 2, number: 0 },
        } as PageBusStopDTO)
      ),
      getAllBusStopsCatalog: vi.fn().mockReturnValue(of(mockStops)),
      createBusStop: vi.fn().mockReturnValue(of({ id: 5, name: 'New Stop' })),
      updateBusStop: vi.fn().mockReturnValue(of({ id: 1, name: 'Updated Stop' })),
      deleteBusStop: vi.fn().mockReturnValue(of(void 0)),
    };

    mockMessageService = {
      add: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: BusStopService, useValue: mockBusStopService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: FormBuilder, useClass: FormBuilder },
      ],
    });

    component = runInInjectionContext(injector, () => new BusStopsManagement());
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should initialize and load bus stops using server pagination', () => {
    component.ngOnInit();

    expect(mockBusStopService.getAllBusStops).toHaveBeenCalledWith({
      page: 0,
      size: 10,
    });
    expect(component.busStops().length).toBe(2);
    expect(component.totalElements()).toBe(4);
    expect(component.isCityFilterActive()).toBe(false);
  });

  it('should debounce search input by 300ms, reset page to 0, and query backend with q', () => {
    component.ngOnInit();
    component.currentPage.set(1);
    mockBusStopService.getAllBusStops.mockClear();

    component.onSearchInput('Tahrir');
    vi.advanceTimersByTime(200);
    expect(mockBusStopService.getAllBusStops).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(component.currentPage()).toBe(0);
    expect(mockBusStopService.getAllBusStops).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      q: 'Tahrir',
    });
  });

  it('should debounce city search input by 300ms, fetch catalog, and perform partial case-insensitive matching', () => {
    component.ngOnInit();

    component.onCityInput('c');
    vi.advanceTimersByTime(300);

    expect(component.isCityFilterActive()).toBe(true);
    expect(mockBusStopService.getAllBusStopsCatalog).toHaveBeenCalledTimes(1);

    // 'Cairo' and 'Canal Zone' both contain 'c'
    const displayed = component.displayedBusStops();
    expect(displayed.length).toBe(2);
    expect(displayed.map((s) => s.city)).toEqual(['Cairo', 'Canal Zone']);
    expect(component.totalElements()).toBe(2);
  });

  it('should match city case-insensitively when typing "CAI"', () => {
    component.ngOnInit();

    component.onCityInput('CAI');
    vi.advanceTimersByTime(300);

    const displayed = component.displayedBusStops();
    expect(displayed.length).toBe(1);
    expect(displayed[0].name).toBe('Tahrir Square Hub');
    expect(component.totalElements()).toBe(1);
  });

  it('should restore server pagination when clearing city filter', () => {
    component.ngOnInit();
    component.onCityInput('cairo');
    vi.advanceTimersByTime(300);
    expect(component.isCityFilterActive()).toBe(true);

    mockBusStopService.getAllBusStops.mockClear();

    component.clearFilters();

    expect(component.cityFilter()).toBe('');
    expect(component.isCityFilterActive()).toBe(false);
    expect(mockBusStopService.getAllBusStops).toHaveBeenCalledWith({
      page: 0,
      size: 10,
    });
  });

  it('should invalidate cache when creating, updating, or deleting a bus stop', () => {
    component.ngOnInit();
    component.allBusStopsCache.set(mockStops);

    // Create
    component.stopForm.patchValue({
      name: 'New Stop',
      city: 'Cairo',
      address: 'Street',
      latitude: 30,
      longitude: 31,
    });
    component.isEditMode.set(false);
    component.saveStop();

    expect(mockBusStopService.createBusStop).toHaveBeenCalled();
    expect(component.allBusStopsCache()).toBeNull();

    // Re-populate & Edit
    component.allBusStopsCache.set(mockStops);
    component.isEditMode.set(true);
    component.editingStopId.set(1);
    component.saveStop();

    expect(mockBusStopService.updateBusStop).toHaveBeenCalled();
    expect(component.allBusStopsCache()).toBeNull();

    // Re-populate & Delete
    component.allBusStopsCache.set(mockStops);
    component.stopToDelete.set(mockStops[0]);
    component.confirmDeleteStop();

    expect(mockBusStopService.deleteBusStop).toHaveBeenCalledWith(1);
    expect(component.allBusStopsCache()).toBeNull();
  });
});
