import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { BusFeaturesService } from './bus-features.service';
import { BusFeatureDto, BusFeatureRequestDto } from '../models/Bus/bus-feature.model';
import { environment } from '../../../environments/environment';

describe('BusFeaturesService', () => {
  let service: BusFeaturesService;
  let mockHttp: any;
  const baseUrl = `${environment.apiBaseUrl}/bus-features`;

  const mockFeatures: BusFeatureDto[] = [
    { id: 1, code: 'WIFI', nameKey: 'bus.feature.wifi', surcharge: 10.0, active: true },
    { id: 2, code: 'AC', nameKey: 'bus.feature.ac', surcharge: 5.0, active: true },
  ];

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const injector = Injector.create({
      providers: [{ provide: HttpClient, useValue: mockHttp }],
    });

    service = runInInjectionContext(injector, () => new BusFeaturesService());
  });

  it('should get all features', () => {
    mockHttp.get.mockReturnValue(of(mockFeatures));

    service.getAllFeatures().subscribe((features) => {
      expect(features.length).toBe(2);
      expect(features).toEqual(mockFeatures);
    });

    expect(mockHttp.get).toHaveBeenCalledWith(baseUrl);
  });

  it('should get feature by id', () => {
    mockHttp.get.mockReturnValue(of(mockFeatures[0]));

    service.getFeatureById(1).subscribe((feature) => {
      expect(feature).toEqual(mockFeatures[0]);
    });

    expect(mockHttp.get).toHaveBeenCalledWith(`${baseUrl}/1`);
  });

  it('should create feature', () => {
    const payload: BusFeatureRequestDto = {
      code: 'CHARGER',
      nameKey: 'bus.feature.charger',
      surcharge: 15.0,
      active: true,
    };
    const mockCreated: BusFeatureDto = { id: 3, ...payload };
    mockHttp.post.mockReturnValue(of(mockCreated));

    service.createFeature(payload).subscribe((res) => {
      expect(res).toEqual(mockCreated);
    });

    expect(mockHttp.post).toHaveBeenCalledWith(baseUrl, payload);
  });

  it('should update feature', () => {
    const payload: BusFeatureRequestDto = {
      code: 'WIFI',
      nameKey: 'bus.feature.wifi',
      surcharge: 12.0,
      active: true,
    };
    const mockUpdated: BusFeatureDto = { id: 1, ...payload };
    mockHttp.put.mockReturnValue(of(mockUpdated));

    service.updateFeature(1, payload).subscribe((res) => {
      expect(res).toEqual(mockUpdated);
    });

    expect(mockHttp.put).toHaveBeenCalledWith(`${baseUrl}/1`, payload);
  });

  it('should delete feature', () => {
    mockHttp.delete.mockReturnValue(of(null));

    service.deleteFeature(1).subscribe((res) => {
      expect(res).toBeNull();
    });

    expect(mockHttp.delete).toHaveBeenCalledWith(`${baseUrl}/1`);
  });
});
