import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { BusesManagement } from './buses-management';
import { BusService } from '../../../core/services/bus.service';
import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { MessageService } from 'primeng/api';
import { BusDTO } from '../../../core/models/Bus/bus.model';
import { PageBusDTO } from '../../../core/models/Pagination/busPage.model';

describe('BusesManagement Component', () => {
  let component: BusesManagement;
  let mockBusService: any;
  let mockBusSeatService: any;
  let mockBusBookingService: any;
  let mockMessageService: any;

  const mockBuses: BusDTO[] = [
    { id: 1, busNumber: 'BUS-101', company: 'GoBus', capacity: 45, busType: 'DELUXE' },
    { id: 2, busNumber: 'BUS-202', company: 'BlueBus', capacity: 30, busType: 'VIP' },
  ];

  beforeEach(() => {
    vi.useFakeTimers();

    mockBusService = {
      getAllBuses: vi.fn().mockReturnValue(
        of({
          content: mockBuses,
          totalElements: 2,
          totalPages: 1,
          size: 10,
          number: 0,
          page: { totalElements: 2, totalPages: 1, size: 10, number: 0 },
        } as PageBusDTO)
      ),
      createBus: vi.fn().mockReturnValue(of({ id: 3, busNumber: 'BUS-303' })),
      updateBus: vi.fn().mockReturnValue(of({ id: 1, busNumber: 'BUS-101-UP' })),
      deleteBus: vi.fn().mockReturnValue(of(void 0)),
    };

    mockBusSeatService = {
      getSeatsByBusId: vi.fn().mockReturnValue(of([])),
      generateSeatsForBus: vi.fn().mockReturnValue(of([])),
    };

    mockBusBookingService = {
      getAllBusBookings: vi.fn().mockReturnValue(of({ content: [] })),
    };

    mockMessageService = {
      add: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: BusService, useValue: mockBusService },
        { provide: BusSeatService, useValue: mockBusSeatService },
        { provide: BusBookingService, useValue: mockBusBookingService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: FormBuilder, useClass: FormBuilder },
      ],
    });

    component = runInInjectionContext(injector, () => new BusesManagement());
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should initialize and load buses with server pagination', () => {
    component.ngOnInit();

    expect(mockBusService.getAllBuses).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: 'id,asc',
    });
    expect(component.buses().length).toBe(2);
    expect(component.displayedBuses().length).toBe(2);
    expect(component.totalElements()).toBe(2);
  });

  it('should debounce search input by 300ms, reset page to 0, and query backend with q', () => {
    component.ngOnInit();
    component.currentPage.set(2);
    mockBusService.getAllBuses.mockClear();

    component.onSearchFilter('101');
    vi.advanceTimersByTime(200);
    expect(mockBusService.getAllBuses).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(component.currentPage()).toBe(0);
    expect(mockBusService.getAllBuses).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      q: '101',
      sort: 'id,asc',
    });
  });

  it('should filter by busType, reset page to 0, and pass busType to backend', () => {
    component.ngOnInit();
    component.currentPage.set(2);
    mockBusService.getAllBuses.mockClear();

    component.onBusTypeChange('VIP');

    expect(component.currentPage()).toBe(0);
    expect(component.busTypeFilter()).toBe('VIP');
    expect(mockBusService.getAllBuses).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      busType: 'VIP',
      sort: 'id,asc',
    });
  });

  it('should clear all filters and reset to page 0 on clearFilters', () => {
    component.ngOnInit();
    component.searchFilter.set('BUS');
    component.busTypeFilter.set('DELUXE');
    component.currentPage.set(3);
    mockBusService.getAllBuses.mockClear();

    component.clearFilters();

    expect(component.searchFilter()).toBe('');
    expect(component.busTypeFilter()).toBe('');
    expect(component.currentPage()).toBe(0);
    expect(mockBusService.getAllBuses).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: 'id,asc',
    });
  });

  it('should handle page change and request the correct page', () => {
    component.ngOnInit();
    mockBusService.getAllBuses.mockClear();

    component.onPageChange({ first: 10, rows: 10 });

    expect(component.currentPage()).toBe(1);
    expect(mockBusService.getAllBuses).toHaveBeenCalledWith({
      page: 1,
      size: 10,
      sort: 'id,asc',
    });
  });
});
