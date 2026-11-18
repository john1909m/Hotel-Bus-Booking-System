import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { BusTripsManagement } from './bus-trips-management';
import { BusTripService } from '../../../core/services/bus-trip.service';
import { BusService } from '../../../core/services/bus.service';
import { BusRouteService } from '../../../core/services/bus-route.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { MessageService } from 'primeng/api';
import { BusTripDTO } from '../../../core/models/Bus/bus-trip.model';
import { PageBusTripDTO } from '../../../core/models/Pagination/busTripPage.model';

describe('BusTripsManagement Component', () => {
  let component: BusTripsManagement;
  let mockBusTripService: any;
  let mockBusService: any;
  let mockBusRouteService: any;
  let mockMessageService: any;

  const mockTrips: BusTripDTO[] = [
    {
      id: 1,
      busId: 10,
      routeId: 20,
      departure: '2026-12-01T08:00:00',
      arrivalTime: '2026-12-01T12:00:00',
      price: 150,
      status: 'SCHEDULED',
    },
    {
      id: 2,
      busId: 11,
      routeId: 21,
      departure: '2026-12-02T10:00:00',
      arrivalTime: '2026-12-02T14:00:00',
      price: 250,
      status: 'COMPLETED',
    },
  ];

  const mockBuses = [
    { id: 10, busNumber: 'BUS-100', company: 'GoBus', capacity: 40, busType: 'DELUXE' },
    { id: 11, busNumber: 'BUS-200', company: 'SuperJet', capacity: 50, busType: 'VIP' },
  ];

  const mockRoutes = [
    { id: 20, name: 'Cairo -> Alex', originStopId: 1, destinationStopId: 2, distanceKm: 220, estimatedDurationMinutes: 180 },
    { id: 21, name: 'Giza -> Luxor', originStopId: 3, destinationStopId: 4, distanceKm: 450, estimatedDurationMinutes: 360 },
  ];

  beforeEach(() => {
    vi.useFakeTimers();

    mockBusTripService = {
      getAllBusTrips: vi.fn().mockReturnValue(
        of({
          content: mockTrips,
          totalElements: 2,
          totalPages: 1,
          size: 10,
          number: 0,
          page: { totalElements: 2, totalPages: 1, size: 10, number: 0 },
        } as PageBusTripDTO)
      ),
      getAllBusTripsCatalog: vi.fn().mockReturnValue(of(mockTrips)),
      createBusTrip: vi.fn().mockReturnValue(of({ id: 3, price: 300 })),
      updateBusTrip: vi.fn().mockReturnValue(of({ id: 1, price: 180 })),
      deleteBusTrip: vi.fn().mockReturnValue(of(void 0)),
    };

    mockBusService = {
      getAllBuses: vi.fn().mockReturnValue(of({ content: mockBuses })),
      getAllBusesCatalog: vi.fn().mockReturnValue(of(mockBuses)),
      lookupBuses: vi.fn().mockReturnValue(of(mockBuses)),
    };

    mockBusRouteService = {
      getAllRoutes: vi.fn().mockReturnValue(of({ content: mockRoutes })),
      getAllBusRoutesCatalog: vi.fn().mockReturnValue(of(mockRoutes)),
      lookupBusRoutes: vi.fn().mockReturnValue(of(mockRoutes)),
    };

    const mockBusStopService = {
      getAllBusStopsCatalog: vi.fn().mockReturnValue(of([
        { id: 1, name: 'Cairo Gateway Terminal', city: 'Cairo' },
        { id: 2, name: 'Alexandria Central', city: 'Alexandria' },
      ])),
    };

    mockMessageService = {
      add: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: BusTripService, useValue: mockBusTripService },
        { provide: BusService, useValue: mockBusService },
        { provide: BusRouteService, useValue: mockBusRouteService },
        { provide: BusStopService, useValue: mockBusStopService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: FormBuilder, useClass: FormBuilder },
      ],
    });

    component = runInInjectionContext(injector, () => new BusTripsManagement());
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should initialize, load buses, routes, and trips with server pagination', () => {
    component.ngOnInit();

    expect(mockBusTripService.getAllBusTrips).toHaveBeenCalledWith({
      page: 0,
      size: 10,
    });
    expect(mockBusService.getAllBusesCatalog).toHaveBeenCalled();
    expect(mockBusRouteService.getAllBusRoutesCatalog).toHaveBeenCalled();
    expect(component.trips().length).toBe(2);
    expect(component.totalElements()).toBe(2);
    expect(component.isSearchFilterActive()).toBe(false);
  });

  it('should ensure numeric busId and routeId are sent in POST body when creating a trip', () => {
    component.ngOnInit();
    component.openCreateDialog();

    component.tripForm.patchValue({
      busId: 10,
      routeId: 20,
      departure: '2026-12-05T10:00',
      arrivalTime: '2026-12-05T14:00',
      price: 200,
      status: 'SCHEDULED',
    });

    component.saveTrip();

    expect(mockBusTripService.createBusTrip).toHaveBeenCalledWith({
      busId: 10,
      routeId: 20,
      departureTime: '2026-12-05T10:00:00',
      arrivalTime: '2026-12-05T14:00:00',
      price: 200,
      status: 'SCHEDULED',
    });
  });

  it('should debounce search input by 300ms, fetch catalog, and perform partial matching across displayed fields', () => {
    component.ngOnInit();

    // Search by bus company 'GoBus'
    component.onSearchInput('gobus');
    vi.advanceTimersByTime(200);
    expect(mockBusTripService.getAllBusTripsCatalog).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(component.isSearchFilterActive()).toBe(true);
    expect(mockBusTripService.getAllBusTripsCatalog).toHaveBeenCalledTimes(1);

    const displayed = component.displayedTrips();
    expect(displayed.length).toBe(1);
    expect(displayed[0].id).toBe(1);
    expect(component.totalElements()).toBe(1);
  });

  it('should match case-insensitively on status and price', () => {
    component.ngOnInit();

    component.onSearchInput('completed');
    vi.advanceTimersByTime(300);

    let displayed = component.displayedTrips();
    expect(displayed.length).toBe(1);
    expect(displayed[0].id).toBe(2);

    component.onSearchInput('150');
    vi.advanceTimersByTime(300);

    displayed = component.displayedTrips();
    expect(displayed.length).toBe(1);
    expect(displayed[0].id).toBe(1);
  });

  it('should filter by status dropdown and reset page to 0', () => {
    component.ngOnInit();
    component.currentPage.set(2);
    mockBusTripService.getAllBusTrips.mockClear();

    component.onStatusChange('COMPLETED');

    expect(component.currentPage()).toBe(0);
    expect(component.statusFilter()).toBe('COMPLETED');
    expect(mockBusTripService.getAllBusTrips).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      status: 'COMPLETED' as any,
    });
  });

  it('should filter by bus dropdown and route dropdown', () => {
    component.ngOnInit();
    component.currentPage.set(2);
    mockBusTripService.getAllBusTrips.mockClear();

    component.onBusChange('10');
    expect(component.selectedBusId()).toBe(10);
    expect(mockBusTripService.getAllBusTrips).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      busId: 10,
    });

    mockBusTripService.getAllBusTrips.mockClear();
    component.onRouteChange('20');
    expect(component.selectedRouteId()).toBe(20);
    expect(mockBusTripService.getAllBusTrips).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      busId: 10,
      routeId: 20,
    });
  });

  it('should reset all filters on clearFilters', () => {
    component.ngOnInit();
    component.searchQuery.set('test');
    component.statusFilter.set('COMPLETED');
    component.selectedBusId.set(10);
    component.selectedRouteId.set(20);
    component.currentPage.set(2);
    mockBusTripService.getAllBusTrips.mockClear();

    component.clearFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.statusFilter()).toBe('');
    expect(component.selectedBusId()).toBeNull();
    expect(component.selectedRouteId()).toBeNull();
    expect(component.currentPage()).toBe(0);
    expect(mockBusTripService.getAllBusTrips).toHaveBeenCalledWith({
      page: 0,
      size: 10,
    });
  });

  it('should invalidate cache when creating, updating, or deleting a trip', () => {
    component.ngOnInit();
    component.allBusTripsCache.set(mockTrips);

    // Create
    component.tripForm.patchValue({
      busId: 10,
      routeId: 20,
      departure: '2026-12-05T10:00:00',
      arrivalTime: '2026-12-05T14:00:00',
      price: 200,
      status: 'SCHEDULED',
    });
    component.isEditMode.set(false);
    component.saveTrip();

    expect(mockBusTripService.createBusTrip).toHaveBeenCalled();
    expect(component.allBusTripsCache()).toBeNull();

    // Re-populate & Edit
    component.allBusTripsCache.set(mockTrips);
    component.isEditMode.set(true);
    component.editingTripId.set(1);
    component.saveTrip();

    expect(mockBusTripService.updateBusTrip).toHaveBeenCalled();
    expect(component.allBusTripsCache()).toBeNull();

    // Re-populate & Delete
    component.allBusTripsCache.set(mockTrips);
    component.tripToDelete.set(mockTrips[0]);
    component.confirmDeleteTrip();

    expect(mockBusTripService.deleteBusTrip).toHaveBeenCalledWith(1);
    expect(component.allBusTripsCache()).toBeNull();
  });

  it('should correctly populate form in openEditDialog when trip uses departureTime and format ISO with :00 on save', () => {
    component.ngOnInit();
    const tripWithDepartureTime: BusTripDTO = {
      id: 5,
      busId: 10,
      routeId: 20,
      departureTime: '2026-12-15T09:30:00',
      arrivalTime: '2026-12-15T13:30:00',
      price: 180,
      status: 'SCHEDULED',
    };

    component.openEditDialog(tripWithDepartureTime);

    expect(component.isEditMode()).toBe(true);
    expect(component.editingTripId()).toBe(5);
    expect(component.tripForm.value.departure).toBe('2026-12-15T09:30');
    expect(component.tripForm.value.arrivalTime).toBe('2026-12-15T13:30');
    expect(component.tripForm.value.price).toBe(180);
    expect(component.tripForm.value.status).toBe('SCHEDULED');

    // Change status and time
    component.tripForm.patchValue({
      departure: '2026-12-15T10:00',
      arrivalTime: '2026-12-15T14:00',
      status: 'CANCELLED',
    });

    component.saveTrip();

    expect(mockBusTripService.updateBusTrip).toHaveBeenCalledWith(5, {
      busId: 10,
      routeId: 20,
      departureTime: '2026-12-15T10:00:00',
      arrivalTime: '2026-12-15T14:00:00',
      price: 180,
      status: 'CANCELLED',
    });
  });

  it('getBusLabel resolves bus from busId, trip object, or unassigned fallback (Item C4)', () => {
    component.ngOnInit();

    // From busId
    expect(component.getBusLabel(10)).toBe('BUS-100 (GoBus)');

    // From trip.bus object
    const tripWithBus = {
      id: 1,
      busId: null,
      bus: { id: 10, busNumber: 'B-999', company: 'GoBus' },
    };
    expect(component.getBusLabel(null, tripWithBus)).toBe('B-999 (GoBus)');

    // Unassigned fallback when neither is present
    expect(component.getBusLabel(null, { id: 2, busId: null })).toBe('Unassigned Vehicle');
  });
});
