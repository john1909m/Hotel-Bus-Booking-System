import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { BusRoutesManagement } from './bus-routes-management';
import { BusRouteService } from '../../../core/services/bus-route.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { MessageService } from 'primeng/api';
import { BusRouteDTO } from '../../../core/models/Bus/bus-route';
import { BusStopDto } from '../../../core/models/Bus/bus-stop.model';
import { PageBusRouteDTO } from '../../../core/models/Pagination/busRoutePage.model';

describe('BusRoutesManagement Component', () => {
  let component: BusRoutesManagement;
  let mockBusRouteService: any;
  let mockBusStopService: any;
  let mockMessageService: any;

  const mockStops: BusStopDto[] = [
    { id: 1, name: 'Cairo Gateway Terminal', city: 'Cairo' },
    { id: 2, name: 'Alexandria Central', city: 'Alexandria' },
    { id: 3, name: 'Giza Plaza', city: 'Giza' },
  ];

  const mockRoutes: BusRouteDTO[] = [
    { id: 10, name: 'Cairo -> Alex', originStopId: 1, destinationStopId: 2, duration: 180 },
    { id: 11, name: 'Cairo -> Giza', originStopId: 1, destinationStopId: 3, duration: 60 },
  ];

  beforeEach(() => {
    mockBusRouteService = {
      getAllBusRoutes: vi.fn().mockReturnValue(
        of({
          content: mockRoutes,
          totalElements: 2,
          totalPages: 1,
          size: 10,
          number: 0,
        } as PageBusRouteDTO)
      ),
      createBusRoute: vi.fn().mockReturnValue(of({ id: 12, name: 'Cairo Gateway Terminal → Giza Plaza', duration: 60 })),
      updateBusRoute: vi.fn().mockReturnValue(of({ id: 10, name: 'Updated Route' })),
      deleteBusRoute: vi.fn().mockReturnValue(of(void 0)),
    };

    mockBusStopService = {
      getAllBusStopsCatalog: vi.fn().mockReturnValue(of(mockStops)),
    };

    mockMessageService = {
      add: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: BusRouteService, useValue: mockBusRouteService },
        { provide: BusStopService, useValue: mockBusStopService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: FormBuilder, useClass: FormBuilder },
      ],
    });

    component = runInInjectionContext(injector, () => new BusRoutesManagement());
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should initialize and load stops using getAllBusStopsCatalog', () => {
    component.ngOnInit();
    expect(mockBusStopService.getAllBusStopsCatalog).toHaveBeenCalled();
    expect(mockBusRouteService.getAllBusRoutes).toHaveBeenCalled();
    expect(component.stops().length).toBe(3);
    expect(component.routes().length).toBe(2);
  });

  it('should format route options and displays as "Origin Terminal → Destination Terminal"', () => {
    component.ngOnInit();
    const route1 = mockRoutes[0];
    const display = component.getRouteDisplay(route1);
    expect(display).toBe('Cairo Gateway Terminal → Alexandria Central');
  });

  it('should populate default route name with "Origin Terminal → Destination Terminal" on openCreateDialog', () => {
    component.ngOnInit();
    component.openCreateDialog();
    const formVal = component.routeForm.getRawValue();
    expect(formVal.name).toBe('Cairo Gateway Terminal → Alexandria Central');
    expect(formVal.originStopId).toBe(1);
    expect(formVal.destinationStopId).toBe(2);
  });

  it('should save route sending originStopId, destinationStopId, duration, and name', () => {
    component.ngOnInit();
    component.openCreateDialog();

    component.routeForm.patchValue({
      name: '',
      originStopId: 1,
      destinationStopId: 3,
      duration: 75,
    });

    component.saveRoute();

    expect(mockBusRouteService.createBusRoute).toHaveBeenCalledWith({
      name: 'Cairo Gateway Terminal → Giza Plaza',
      duration: 75,
      originStopId: 1,
      destinationStopId: 3,
    });
  });
});
