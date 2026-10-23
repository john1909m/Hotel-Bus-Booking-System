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
import { MessageService } from 'primeng/api';

// Core Models & Services
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusStopDto, BusStopRequestDto } from '../../../core/models/Bus/bus-stop.model';
import { PageBusStopDTO, BusStopListParams } from '../../../core/models/Pagination/busStopPage.model';

@Component({
  selector: 'app-bus-stops-management',
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
  ],
  providers: [MessageService],
  templateUrl: './bus-stops-management.html',
  styleUrl: './bus-stops-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusStopsManagement implements OnInit, OnDestroy {
  private readonly busStopService = inject(BusStopService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  readonly busStops = signal<BusStopDto[]>([]);
  readonly pageData = signal<PageBusStopDTO | null>(null);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchQuery = signal<string>('');
  readonly cityFilter = signal<string>('');
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

  // ── Dialog Signals ─────────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingStopId = signal<number | null>(null);

  readonly deleteDialogVisible = signal<boolean>(false);
  readonly stopToDelete = signal<BusStopDto | null>(null);

  readonly totalElements = computed(() => this.pageData()?.totalElements ?? 0);
  readonly firstRow = computed(() => this.currentPage() * this.pageSize());
  readonly hasActiveFilters = computed(
    () => !!(this.searchQuery() || this.cityFilter())
  );

  // ── Reactive Form ──────────────────────────────────────────
  readonly stopForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    address: ['', [Validators.required, Validators.maxLength(255)]],
    latitude: [30.0444, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [31.2357, [Validators.required, Validators.min(-180), Validators.max(180)]],
  });

  ngOnInit(): void {
    this.searchSubject$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(0);
        this.loadBusStops();
      });

    this.loadBusStops();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBusStops(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: BusStopListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
    };

    const q = this.searchQuery().trim();
    if (q) params.q = q;

    const city = this.cityFilter().trim();
    if (city) params.city = city;

    this.busStopService
      .getAllBusStops(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.busStops.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load bus stops from backend.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Stops',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject$.next(value);
  }

  onCityChange(value: string): void {
    this.cityFilter.set(value);
    this.currentPage.set(0);
    this.loadBusStops();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.cityFilter.set('');
    this.currentPage.set(0);
    this.loadBusStops();
  }

  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.currentPage.set(pageIndex);
    this.loadBusStops();
  }

  // ── Create & Edit Handlers ─────────────────────────────────
  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.editingStopId.set(null);
    this.stopForm.reset({
      name: '',
      city: '',
      address: '',
      latitude: 30.0444,
      longitude: 31.2357,
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(stop: BusStopDto): void {
    this.isEditMode.set(true);
    this.editingStopId.set(stop.id);
    this.stopForm.patchValue({
      name: stop.name,
      city: stop.city,
      address: stop.address,
      latitude: stop.latitude ?? 30.0444,
      longitude: stop.longitude ?? (stop as any).longtude ?? 31.2357,
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.stopForm.reset();
  }

  saveStop(): void {
    if (this.stopForm.invalid) {
      this.stopForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please check the required fields in the form.',
        life: 4000,
      });
      return;
    }

    this.saving.set(true);
    const formVal = this.stopForm.getRawValue();

    const payload: BusStopRequestDto = {
      name: String(formVal.name).trim(),
      city: String(formVal.city).trim(),
      address: String(formVal.address).trim(),
      latitude: Number(formVal.latitude),
      longitude: Number(formVal.longitude),
    };

    if (this.isEditMode()) {
      const id = this.editingStopId();
      if (!id) {
        this.saving.set(false);
        return;
      }

      this.busStopService
        .updateBusStop(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Bus Stop Updated',
              detail: `Stop "${updated.name}" has been updated.`,
              life: 4000,
            });
            this.loadBusStops();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to update bus stop.';
            this.messageService.add({
              severity: 'error',
              summary: 'Update Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    } else {
      this.busStopService
        .createBusStop(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Bus Stop Created',
              detail: `Stop "${created.name}" has been created.`,
              life: 4000,
            });
            this.currentPage.set(0);
            this.loadBusStops();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to create bus stop.';
            this.messageService.add({
              severity: 'error',
              summary: 'Creation Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    }
  }

  // ── Delete Confirmation Handlers ───────────────────────────
  openDeleteDialog(stop: BusStopDto): void {
    this.stopToDelete.set(stop);
    this.deleteDialogVisible.set(true);
  }

  closeDeleteDialog(): void {
    this.deleteDialogVisible.set(false);
    this.stopToDelete.set(null);
  }

  confirmDeleteStop(): void {
    const stop = this.stopToDelete();
    if (!stop) return;

    this.deleting.set(true);
    this.busStopService
      .deleteBusStop(stop.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.stopToDelete.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Bus Stop Deleted',
            detail: `Stop "${stop.name}" has been removed.`,
            life: 4000,
          });

          if (this.busStops().length === 1 && this.currentPage() > 0) {
            this.currentPage.update((p) => p - 1);
          }
          this.loadBusStops();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = err?.message || 'Failed to delete bus stop.';
          this.messageService.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail: msg,
            life: 5000,
          });
        },
      });
  }
}
