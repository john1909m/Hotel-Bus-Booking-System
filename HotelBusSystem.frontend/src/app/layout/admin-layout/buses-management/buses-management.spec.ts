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
      getAllBusSeats: vi.fn().mockReturnValue(of([])),
      getSeatsByBusId: vi.fn().mockReturnValue(of([])),
      getBusSeatsByBusId: vi.fn().mockReturnValue(of([])),
      generateSeatsForBus: vi.fn().mockReturnValue(of([])),
      createBusSeat: vi.fn().mockImplementation((req) => of({ id: 100, ...req })),
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

  describe('Part A: Bus Seat Generation', () => {
    it('should ignore second quick click while seat generation is in progress', () => {
      const bus: BusDTO = { id: 1, busNumber: 'BUS-101', company: 'GoBus', capacity: 3, busType: 'DELUXE' };
      mockBusSeatService.getBusSeatsByBusId.mockReturnValue(of([]));

      expect(component.generatingSeats()).toBe(false);

      // First click
      component.autoGenerateSeatsForBus(bus, 3);
      expect(mockBusSeatService.getBusSeatsByBusId).toHaveBeenCalledTimes(1);
      expect(mockBusSeatService.createBusSeat).toHaveBeenCalledTimes(3);

      // While generatingSeats is true, simulate second quick click
      component.generatingSeats.set(true);
      component.autoGenerateSeatsForBus(bus, 3);

      // The second call must be ignored, count remains 1
      expect(mockBusSeatService.getBusSeatsByBusId).toHaveBeenCalledTimes(1);
    });

    it('should generate only missing seats when some seats already exist', () => {
      const bus: BusDTO = { id: 1, busNumber: 'BUS-101', company: 'GoBus', capacity: 3, busType: 'DELUXE' };
      // Seat 1 already exists
      mockBusSeatService.getBusSeatsByBusId.mockReturnValue(of([
        { id: 10, seatNumber: '1', seatType: 'PREMIUM', busId: 1 }
      ]));
      mockBusSeatService.createBusSeat.mockClear();

      component.autoGenerateSeatsForBus(bus, 3);

      // Should only create missing seats '2' and '3'
      expect(mockBusSeatService.createBusSeat).toHaveBeenCalledTimes(2);
      expect(mockBusSeatService.createBusSeat).toHaveBeenCalledWith(expect.objectContaining({ seatNumber: '2' }));
      expect(mockBusSeatService.createBusSeat).toHaveBeenCalledWith(expect.objectContaining({ seatNumber: '3' }));
    });

    it('generateSeatsFromAction should invoke seat generation for that bus', () => {
      const bus: BusDTO = { id: 2, busNumber: 'BUS-202', company: 'BlueBus', capacity: 2, busType: 'VIP' };
      mockBusSeatService.getBusSeatsByBusId.mockReturnValue(of([]));
      mockBusSeatService.createBusSeat.mockClear();

      component.generateSeatsFromAction(bus);

      expect(mockBusSeatService.getBusSeatsByBusId).toHaveBeenCalledWith(2);
      expect(mockBusSeatService.createBusSeat).toHaveBeenCalledTimes(2);
    });
  });

  describe('Part B: Coach Type Field', () => {
    it('should compute distinct, alphabetically sorted coach types and not include numeric IDs', () => {
      component.buses.set([
        { id: 1, busNumber: 'B1', company: 'C1', capacity: 40, busType: 'VIP' },
        { id: 2, busNumber: 'B2', company: 'C2', capacity: 40, busType: 'STANDARD' },
        { id: 3, busNumber: 'B3', company: 'C3', capacity: 40, busType: 'VIP' }, // Duplicate
        { id: 4, busNumber: 'B4', company: 'C4', capacity: 40, busType: '1' }, // Corrupted numeric ID
      ]);

      const types = component.coachTypes();

      expect(types).toContain('STANDARD');
      expect(types).toContain('VIP');
      expect(types).not.toContain('1');
      // Must be unique and sorted
      expect(types).toEqual([...new Set(types)].sort());
    });

    it('getCoachTypeDisplay should return name or fallback to STANDARD for numeric strings', () => {
      expect(component.getCoachTypeDisplay('VIP')).toBe('VIP');
      expect(component.getCoachTypeDisplay('1')).toBe('STANDARD');
      expect(component.getCoachTypeDisplay('')).toBe('STANDARD');
    });

    it('openEditDialog should populate busType with name and saveBus should send string name', () => {
      const bus: BusDTO = { id: 5, busNumber: 'BUS-VIP', company: 'GoBus', capacity: 30, busType: 'VIP' };
      component.openEditDialog(bus);

      expect(component.busForm.get('busType')?.value).toBe('VIP');

      component.saveBus();

      expect(mockBusService.updateBus).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          busType: 'VIP',
        })
      );
    });

    it('hasSeats should return true when seat count > 0 and false when 0', () => {
      const bus: BusDTO = { id: 1, busNumber: 'BUS-101', company: 'GoBus', capacity: 45, busType: 'DELUXE' };
      expect(component.hasSeats(bus)).toBe(false);

      const map = new Map<number, number>();
      map.set(1, 45);
      component.busSeatCountMap.set(map);

      expect(component.hasSeats(bus)).toBe(true);
    });
  });
});
