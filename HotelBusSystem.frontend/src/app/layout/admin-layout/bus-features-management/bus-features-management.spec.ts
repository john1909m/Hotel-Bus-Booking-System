import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { BusFeaturesManagement } from './bus-features-management';
import { BusFeaturesService } from '../../../core/services/bus-features.service';
import { MessageService } from 'primeng/api';
import { BusFeatureDto } from '../../../core/models/Bus/bus-feature.model';

describe('BusFeaturesManagement Component', () => {
  let component: BusFeaturesManagement;
  let mockBusFeaturesService: any;
  let mockMessageService: any;

  const mockFeatures: BusFeatureDto[] = [
    { id: 1, code: 'WIFI', nameKey: 'bus.feature.wifi', surcharge: 10.0, active: true },
    { id: 2, code: 'AC', nameKey: 'bus.feature.ac', surcharge: 5.0, active: true },
    { id: 3, code: 'SNACKS', nameKey: 'bus.feature.snacks', surcharge: 15.0, active: false },
  ];

  beforeEach(() => {
    vi.useFakeTimers();

    mockBusFeaturesService = {
      getAllFeatures: vi.fn().mockReturnValue(of([...mockFeatures])),
      getFeatureById: vi.fn().mockImplementation((id: number) => of(mockFeatures.find((f) => f.id === id))),
      createFeature: vi.fn().mockImplementation((dto: any) => of({ id: 4, ...dto })),
      updateFeature: vi.fn().mockImplementation((id: number, dto: any) => of({ id, ...dto })),
      deleteFeature: vi.fn().mockReturnValue(of(void 0)),
    };

    mockMessageService = {
      add: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: BusFeaturesService, useValue: mockBusFeaturesService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: FormBuilder, useClass: FormBuilder },
      ],
    });

    component = runInInjectionContext(injector, () => new BusFeaturesManagement());
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should initialize and load all bus features', () => {
    component.ngOnInit();
    expect(mockBusFeaturesService.getAllFeatures).toHaveBeenCalled();
    expect(component.features().length).toBe(3);
    expect(component.filteredFeatures().length).toBe(3);
    expect(component.loading()).toBe(false);
  });

  it('should filter features by active status', () => {
    component.ngOnInit();
    component.onStatusFilterChange('ACTIVE');
    expect(component.filteredFeatures().length).toBe(2);
    expect(component.filteredFeatures().every((f) => f.active)).toBe(true);

    component.onStatusFilterChange('INACTIVE');
    expect(component.filteredFeatures().length).toBe(1);
    expect(component.filteredFeatures()[0].code).toBe('SNACKS');
  });

  it('should filter features by search keyword', () => {
    component.ngOnInit();
    component.onSearchInput('wifi');
    vi.advanceTimersByTime(350);
    expect(component.filteredFeatures().length).toBe(1);
    expect(component.filteredFeatures()[0].code).toBe('WIFI');
  });

  it('should open create dialog with default values', () => {
    component.openCreateDialog();
    expect(component.dialogVisible()).toBe(true);
    expect(component.isEditMode()).toBe(false);
    expect(component.featureForm.get('code')?.value).toBe('');
    expect(component.featureForm.get('active')?.value).toBe(true);
  });

  it('should open edit dialog populated with feature data', () => {
    component.openEditDialog(mockFeatures[0]);
    expect(component.dialogVisible()).toBe(true);
    expect(component.isEditMode()).toBe(true);
    expect(component.editingFeatureId()).toBe(1);
    expect(component.featureForm.get('code')?.value).toBe('WIFI');
    expect(component.featureForm.get('surcharge')?.value).toBe(10.0);
  });

  it('should save a new feature and reload features', () => {
    component.openCreateDialog();
    component.featureForm.patchValue({
      code: 'CHARGER',
      nameKey: 'bus.feature.charger',
      surcharge: 8.5,
      active: true,
    });

    component.saveFeature();
    expect(mockBusFeaturesService.createFeature).toHaveBeenCalledWith({
      code: 'CHARGER',
      nameKey: 'bus.feature.charger',
      surcharge: 8.5,
      active: true,
    });
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' })
    );
    expect(component.dialogVisible()).toBe(false);
  });

  it('should update an existing feature', () => {
    component.openEditDialog(mockFeatures[0]);
    component.featureForm.patchValue({
      surcharge: 12.0,
    });

    component.saveFeature();
    expect(mockBusFeaturesService.updateFeature).toHaveBeenCalledWith(1, {
      code: 'WIFI',
      nameKey: 'bus.feature.wifi',
      surcharge: 12.0,
      active: true,
    });
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' })
    );
    expect(component.dialogVisible()).toBe(false);
  });

  it('should confirm and execute delete feature', () => {
    component.confirmDelete(mockFeatures[0]);
    expect(component.deleteDialogVisible()).toBe(true);
    expect(component.featureToDelete()?.id).toBe(1);

    component.executeDelete();
    expect(mockBusFeaturesService.deleteFeature).toHaveBeenCalledWith(1);
    expect(component.deleteDialogVisible()).toBe(false);
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' })
    );
  });

  it('should handle error when loading features', () => {
    mockBusFeaturesService.getAllFeatures.mockReturnValue(throwError(() => new Error('Server error')));
    component.loadFeatures();
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBeTruthy();
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' })
    );
  });
});
