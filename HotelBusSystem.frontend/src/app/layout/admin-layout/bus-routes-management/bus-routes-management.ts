import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Core Models & Services
import { BusRouteService} from '../../../core/services/bus-route.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusRouteDTO, BusRouteRequestDTO } from '../../../core/models/Bus/bus-route';
import { BusStopDto } from '../../../core/models/Bus/bus-stop.model';
import { PageBusRouteDTO, BusRouteListParams  } from '../../../core/models/Pagination/busRoutePage.model';

@Component({
  selector: 'app-bus-routes-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './bus-routes-management.html',
  styleUrl: './bus-routes-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusRoutesManagement implements OnInit, OnDestroy {
  private readonly busRouteService = inject(BusRouteService);
  private readonly busStopService = inject(BusStopService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  readonly routes = signal<BusRouteDTO[]>([]);
  readonly stops = signal<BusStopDto[]>([]);
  readonly pageData = signal<PageBusRouteDTO | null>(null);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchFilter = signal<string>('');
  readonly sortBy = signal<string>('id');
  readonly sortDirection = signal<string>('asc');
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

  // ── Dialog Signals ─────────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingRouteId = signal<number | null>(null);

  readonly deleteDialogVisible = signal<boolean>(false);
  readonly routeToDelete = signal<BusRouteDTO | null>(null);

  readonly totalElements = computed(() => this.pageData()?.totalElements ?? 0);
  readonly firstRow = computed(() => this.currentPage() * this.pageSize());

  readonly displayedRoutes = computed(() => {
    const q = this.searchFilter().trim().toLowerCase();
    const list = this.routes();
    if (!q) return list;
    return list.filter((r) => r.name.toLowerCase().includes(q));
  });

  // ── Reactive Form ──────────────────────────────────────────
  readonly routeForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    duration: [120, [Validators.required, Validators.min(1)]],
    originStopId: [null, [Validators.required]],
    destinationStopId: [null, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadStopsLookup();
    this.loadBusRoutes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStopsLookup(): void {
    this.busStopService
      .lookupBusStops({ size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.stops.set(Array.isArray(data) ? data : []);
        },
        error: () => {
          this.stops.set([]);
        },
      });
  }

  loadBusRoutes(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: BusRouteListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: this.sortBy(),
      sortDirection: this.sortDirection(),
    };

    this.busRouteService
      .getAllBusRoutes(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.routes.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load bus routes from backend.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Routes',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  onSearchFilter(val: string): void {
    this.searchFilter.set(val);
  }

  onSortChange(val: string): void {
    this.sortBy.set(val);
    this.currentPage.set(0);
    this.loadBusRoutes();
  }

  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.currentPage.set(pageIndex);
    this.loadBusRoutes();
  }

  getStopName(stopId: number): string {
    const found = this.stops().find((s) => s.id === stopId);
    return found ? `${found.name} (${found.city})` : `Stop #${stopId}`;
  }

  formatDuration(minutes: number): string {
    if (!minutes && minutes !== 0) return '—';
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  }

  // ── Create & Edit Handlers ─────────────────────────────────
  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.editingRouteId.set(null);
    const defaultOrigin = this.stops().length > 0 ? this.stops()[0].id : null;
    const defaultDest = this.stops().length > 1 ? this.stops()[1].id : null;
    this.routeForm.reset({
      name: '',
      duration: 120,
      originStopId: defaultOrigin,
      destinationStopId: defaultDest,
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(route: BusRouteDTO): void {
    this.isEditMode.set(true);
    this.editingRouteId.set(route.id);
    this.routeForm.patchValue({
      name: route.name,
      duration: route.duration,
      originStopId: route.originStopId,
      destinationStopId: route.destinationStopId,
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.routeForm.reset();
  }

  saveRoute(): void {
    if (this.routeForm.invalid) {
      this.routeForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required route information.',
        life: 4000,
      });
      return;
    }

    const formVal = this.routeForm.getRawValue();

    if (formVal.originStopId === formVal.destinationStopId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Route',
        detail: 'Origin and Destination stops must be different.',
        life: 4000,
      });
      return;
    }

    this.saving.set(true);

    const payload: BusRouteRequestDTO = {
      name: String(formVal.name).trim(),
      duration: Number(formVal.duration),
      originStopId: Number(formVal.originStopId),
      destinationStopId: Number(formVal.destinationStopId),
    };

    if (this.isEditMode()) {
      const id = this.editingRouteId();
      if (!id) {
        this.saving.set(false);
        return;
      }

      this.busRouteService
        .updateBusRoute(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Route Updated',
              detail: `Route "${updated.name}" has been updated.`,
              life: 4000,
            });
            this.loadBusRoutes();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to update bus route.';
            this.messageService.add({
              severity: 'error',
              summary: 'Update Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    } else {
      this.busRouteService
        .createBusRoute(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Route Created',
              detail: `Route "${created.name}" has been created.`,
              life: 4000,
            });
            this.currentPage.set(0);
            this.loadBusRoutes();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to create bus route.';
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

  // ── Delete Handlers ────────────────────────────────────────
  openDeleteDialog(route: BusRouteDTO): void {
    this.routeToDelete.set(route);
    this.deleteDialogVisible.set(true);
  }

  closeDeleteDialog(): void {
    this.deleteDialogVisible.set(false);
    this.routeToDelete.set(null);
  }

  confirmDeleteRoute(): void {
    const route = this.routeToDelete();
    if (!route) return;

    this.deleting.set(true);
    this.busRouteService
      .deleteBusRoute(route.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.routeToDelete.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Route Deleted',
            detail: `Route "${route.name}" has been removed.`,
            life: 4000,
          });

          if (this.routes().length === 1 && this.currentPage() > 0) {
            this.currentPage.update((p) => p - 1);
          }
          this.loadBusRoutes();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = err?.message || 'Failed to delete bus route.';
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
