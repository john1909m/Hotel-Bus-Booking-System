import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

// Core Models & Services
import { BusFeaturesService } from '../../../core/services/bus-features.service';
import { BusFeatureDto, BusFeatureRequestDto } from '../../../core/models/Bus/bus-feature.model';
import { extractErrorMessage } from '../../../core/utils/ErrorHandling';

@Component({
  selector: 'app-bus-features-management',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    ToastModule,
    TagModule,
    TranslatePipe,
  ],
  providers: [MessageService],
  templateUrl: './bus-features-management.html',
  styleUrl: './bus-features-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusFeaturesManagement implements OnInit, OnDestroy {
  private readonly busFeaturesService = inject(BusFeaturesService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService, { optional: true });
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  readonly features = signal<BusFeatureDto[]>([]);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('ALL');

  // ── Dialog Signals ─────────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingFeatureId = signal<number | null>(null);

  readonly deleteDialogVisible = signal<boolean>(false);
  readonly featureToDelete = signal<BusFeatureDto | null>(null);

  readonly featureForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_]+$/)]],
    nameKey: ['', [Validators.required]],
    surcharge: [0, [Validators.required, Validators.min(0)]],
    active: [true],
  });

  readonly filteredFeatures = computed(() => {
    let list = this.features();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    if (status === 'ACTIVE') {
      list = list.filter((f) => f.active);
    } else if (status === 'INACTIVE') {
      list = list.filter((f) => !f.active);
    }

    if (query) {
      list = list.filter(
        (f) =>
          f.code.toLowerCase().includes(query) ||
          f.nameKey.toLowerCase().includes(query) ||
          f.id.toString().includes(query)
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
      });

    this.loadFeatures();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFeatures(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.busFeaturesService
      .getAllFeatures()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.features.set(data || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = extractErrorMessage(err) || 'Failed to load bus features';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: this.tr('admin.common.error', 'Error'),
            detail: msg,
          });
        },
      });
  }

  onSearchInput(value: string): void {
    this.searchSubject$.next(value);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
  }

  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.editingFeatureId.set(null);
    this.featureForm.reset({
      code: '',
      nameKey: '',
      surcharge: 0,
      active: true,
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(feature: BusFeatureDto): void {
    this.isEditMode.set(true);
    this.editingFeatureId.set(feature.id);
    this.featureForm.reset({
      code: feature.code,
      nameKey: feature.nameKey,
      surcharge: feature.surcharge,
      active: feature.active,
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.featureForm.reset();
  }

  saveFeature(): void {
    if (this.featureForm.invalid) {
      this.featureForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const formVal = this.featureForm.value;
    const payload: BusFeatureRequestDto = {
      code: (formVal.code || '').trim().toUpperCase(),
      nameKey: (formVal.nameKey || '').trim(),
      surcharge: Number(formVal.surcharge),
      active: Boolean(formVal.active),
    };

    if (this.isEditMode() && this.editingFeatureId() !== null) {
      const id = this.editingFeatureId()!;
      this.busFeaturesService
        .updateFeature(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: this.tr('admin.common.success', 'Success'),
              detail: this.tr('admin.busFeatures.updatedSuccess', 'Bus feature updated successfully'),
            });
            this.loadFeatures();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = extractErrorMessage(err) || 'Failed to update feature';
            this.messageService.add({
              severity: 'error',
              summary: this.tr('admin.common.error', 'Error'),
              detail: msg,
            });
          },
        });
    } else {
      this.busFeaturesService
        .createFeature(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: this.tr('admin.common.success', 'Success'),
              detail: this.tr('admin.busFeatures.createdSuccess', 'Bus feature created successfully'),
            });
            this.loadFeatures();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = extractErrorMessage(err) || 'Failed to create feature';
            this.messageService.add({
              severity: 'error',
              summary: this.tr('admin.common.error', 'Error'),
              detail: msg,
            });
          },
        });
    }
  }

  confirmDelete(feature: BusFeatureDto): void {
    this.featureToDelete.set(feature);
    this.deleteDialogVisible.set(true);
  }

  cancelDelete(): void {
    this.deleteDialogVisible.set(false);
    this.featureToDelete.set(null);
  }

  executeDelete(): void {
    const feat = this.featureToDelete();
    if (!feat) return;

    this.deleting.set(true);
    this.busFeaturesService
      .deleteFeature(feat.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.featureToDelete.set(null);
          this.messageService.add({
            severity: 'success',
            summary: this.tr('admin.common.success', 'Success'),
            detail: this.tr('admin.busFeatures.deletedSuccess', 'Bus feature deleted successfully'),
          });
          this.loadFeatures();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = extractErrorMessage(err) || 'Failed to delete feature';
          this.messageService.add({
            severity: 'error',
            summary: this.tr('admin.common.error', 'Error'),
            detail: msg,
          });
        },
      });
  }

  private tr(key: string, fallback: string): string {
    if (!this.translate) return fallback;
    const val = this.translate.instant(key);
    return val && val !== key ? val : fallback;
  }
}
