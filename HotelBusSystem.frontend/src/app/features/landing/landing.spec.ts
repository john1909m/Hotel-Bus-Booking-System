import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';
import { Landing } from './landing';
import { BusStopService } from '../../core/services/bus-stop.service';

describe('Landing Component', () => {
  let component: Landing;
  let mockBusStopService: any;
  let mockRouter: any;
  let mockRoute: any;
  let mockSanitizer: any;
  let injector: Injector;

  beforeEach(() => {
    mockBusStopService = {
      getAllBusStops: vi.fn().mockReturnValue(of({ content: [] })),
    };
    mockRouter = {
      navigate: vi.fn(),
    };
    mockRoute = {
      queryParams: of({}),
    };
    mockSanitizer = {
      bypassSecurityTrustHtml: vi.fn((html: string) => html),
    };

    injector = Injector.create({
      providers: [
        FormBuilder,
        { provide: BusStopService, useValue: mockBusStopService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: DomSanitizer, useValue: mockSanitizer },
        Landing,
      ],
    });

    component = runInInjectionContext(injector, () => injector.get(Landing));
  });

  it('should initialize searchForm with default values', () => {
    expect(component.searchForm).toBeDefined();
    expect(component.searchForm.get('originCity')?.value).toBe('');
    expect(component.searchForm.get('destinationCity')?.value).toBe('');
    expect(component.searchForm.get('departureDate')?.value).toBe(component.today);
  });

  it('should invalidate form when origin and destination are the same', () => {
    component.searchForm.patchValue({
      originCity: 'Cairo',
      destinationCity: 'Cairo',
    });

    expect(component.searchForm.errors?.['sameCity']).toBe(true);
  });

  it('should swap origin and destination cities when swapCities() is called', () => {
    component.searchForm.patchValue({
      originCity: 'Cairo',
      destinationCity: 'Alexandria',
    });

    component.swapCities();

    expect(component.searchForm.get('originCity')?.value).toBe('Alexandria');
    expect(component.searchForm.get('destinationCity')?.value).toBe('Cairo');
  });

  it('should load bus stops on ngOnInit', () => {
    component.ngOnInit();
    expect(mockBusStopService.getAllBusStops).toHaveBeenCalled();
  });
});
