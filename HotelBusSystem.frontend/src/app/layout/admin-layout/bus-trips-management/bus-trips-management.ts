import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
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

// Core Models & Services
import { BusTripService} from '../../../core/services/bus-trip.service';
import { BusService } from '../../../core/services/bus.service';
import { BusRouteService } from '../../../core/services/bus-route.service';
import { BusTripDTO, BusTripRequestDTO, status , BusTripListParams } from '../../../core/models/Bus/bus-trip.model';
import { BusDTO } from '../../../core/models/Bus/bus.model';
import { BusRouteDTO } from '../../../core/models/Bus/bus-route';
import { PageBusTripDTO } from '../../../core/models/Pagination/busTripPage.model';

@Component({
  selector: 'app-bus-trips-management',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    ToastModule,
    TagModule,
  ],
  providers: [MessageService],
  templateUrl: './bus-trips-management.html',
  styleUrl: './bus-trips-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusTripsManagement implements OnInit, OnDestroy {
  private readonly busTripService = inject(BusTripService);
  private readonly busService = inject(BusService);
  private readonly busRouteService = inject(BusRouteService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  readonly trips = signal<BusTripDTO[]>([]);
  readonly buses = signal<BusDTO[]>([]);
  readonly routes = signal<BusRouteDTO[]>([]);
  readonly pageData = signal<PageBusTripDTO | null>(null);
  readonly allBusTripsCache = signal<BusTripDTO[] | null>(null);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('');
  readonly selectedBusId = signal<number | null>(null);
  readonly selectedRouteId = signal<number | null>(null);
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

  // ── Dialog Signals ─────────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingTripId = signal<number | null>(null);

  readonly deleteDialogVisible = signal<boolean>(false);
  readonly tripToDelete = signal<BusTripDTO | null>(null);

  readonly isSearchFilterActive = computed(() => !!this.searchQuery().trim());

  readonly filteredTrips = computed(() => {
    const list = this.allBusTripsCache() || this.trips();
    const q = this.searchQuery().trim().toLowerCase();
    const statusVal = this.statusFilter();
    const busId = this.selectedBusId();
    const routeId = this.selectedRouteId();

    return list.filter((trip) => {
      if (statusVal && trip.status !== statusVal) return false;
      if (busId !== null && trip.busId !== busId) return false;
      if (routeId !== null && trip.routeId !== routeId) return false;

      if (q) {
        const busLabel = (this.getBusLabel(trip.busId) || '').toLowerCase();
        const routeLabel = (this.getRouteLabel(trip.routeId) || '').toLowerCase();
        const tripIdStr = String(trip.id);
        const statusStr = (trip.status || '').toLowerCase();
        const departureStr = (trip.departureTime || trip.departure || '').toLowerCase();
        const arrivalStr = (trip.arrivalTime || '').toLowerCase();
        const priceStr = String(trip.price);

        const matches =
          busLabel.includes(q) ||
          routeLabel.includes(q) ||
          tripIdStr.includes(q) ||
          statusStr.includes(q) ||
          departureStr.includes(q) ||
          arrivalStr.includes(q) ||
          priceStr.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  });

  readonly displayedTrips = computed(() => {
    if (this.isSearchFilterActive()) {
      const start = this.firstRow();
      return this.filteredTrips().slice(start, start + this.pageSize());
    }
    return this.trips();
  });

  readonly totalElements = computed(() => {
    if (this.isSearchFilterActive()) {
      return this.filteredTrips().length;
    }
    return this.pageData()?.totalElements ?? this.pageData()?.page?.totalElements ?? 0;
  });

  readonly firstRow = computed(() => this.currentPage() * this.pageSize());
  readonly hasActiveFilters = computed(
    () =>
      !!(
        this.searchQuery() ||
        this.statusFilter() ||
        this.selectedBusId() !== null ||
        this.selectedRouteId() !== null
      )
  );

  // ── Reactive Form ──────────────────────────────────────────
  readonly tripForm: FormGroup = this.fb.group({
    busId: [null, [Validators.required]],
    routeId: [null, [Validators.required]],
    departure: ['', [Validators.required]],
    arrivalTime: ['', [Validators.required]],
    price: [50, [Validators.required, Validators.min(1)]],
    status: ['SCHEDULED', [Validators.required]],
  });

  ngOnInit(): void {
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(0);
        this.handleFilterChange();
      });

    this.loadLookups();
    this.loadTrips();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  handleFilterChange(): void {
    if (this.isSearchFilterActive()) {
      if (!this.allBusTripsCache()) {
        this.loadAllTripsForSearch();
      }
    } else {
      this.loadTrips();
    }
  }

  private loadAllTripsForSearch(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.busTripService
      .getAllBusTripsCatalog()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (allTrips) => {
          this.allBusTripsCache.set(allTrips);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load bus trips catalog.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Trips',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  loadLookups(): void {
    this.busService
      .lookupBuses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => this.buses.set(Array.isArray(list) ? list : []),
        error: () => this.buses.set([]),
      });

    this.busRouteService
      .lookupBusRoutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => this.routes.set(Array.isArray(list) ? list : []),
        error: () => this.routes.set([]),
      });
  }

  loadTrips(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: BusTripListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
    };

    const s = this.statusFilter();
    if (s) params.status = s as status;

    const busId = this.selectedBusId();
    if (busId !== null) params.busId = busId;

    const routeId = this.selectedRouteId();
    if (routeId !== null) params.routeId = routeId;

    this.busTripService
      .getAllBusTrips(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.trips.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load bus trips from backend.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Trips',
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

  onStatusChange(val: string): void {
    this.statusFilter.set(val);
    this.currentPage.set(0);
    this.handleFilterChange();
  }

  onBusChange(val: string): void {
    const busId = val ? parseInt(val, 10) : null;
    this.selectedBusId.set(isNaN(busId as any) ? null : busId);
    this.currentPage.set(0);
    this.handleFilterChange();
  }

  onRouteChange(val: string): void {
    const routeId = val ? parseInt(val, 10) : null;
    this.selectedRouteId.set(isNaN(routeId as any) ? null : routeId);
    this.currentPage.set(0);
    this.handleFilterChange();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.selectedBusId.set(null);
    this.selectedRouteId.set(null);
    this.currentPage.set(0);
    this.loadTrips();
  }

  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.currentPage.set(pageIndex);
    if (!this.isSearchFilterActive()) {
      this.loadTrips();
    }
  }

  getBusLabel(busId?: number | null, trip?: any): string {
    if (trip?.bus?.company || trip?.bus?.busNumber) {
      return `${trip.bus.busNumber || ''} (${trip.bus.company || ''})`.trim();
    }
    const resolvedId = busId ?? trip?.busId ?? trip?.bus?.id;
    if (!resolvedId) {
      return 'Unassigned Vehicle';
    }
    const found = this.buses().find((b) => b.id === resolvedId);
    return found ? `${found.busNumber} (${found.company})` : `Bus #${resolvedId}`;
  }

  getRouteLabel(routeId: number): string {
    const found = this.routes().find((r) => r.id === routeId);
    return found?.name || `Route #${routeId}`;
  }

  getStatusSeverity(s: status | string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (s) {
      case 'SCHEDULED':
        return 'info';
      case 'DEPARTED':
        return 'warn';
      case 'ARRIVED':
        return 'success';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  // ── Create & Edit Handlers ─────────────────────────────────
  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.editingTripId.set(null);
    const defaultBus = this.buses().length > 0 ? this.buses()[0].id : null;
    const defaultRoute = this.routes().length > 0 ? this.routes()[0].id : null;

    // Helper for datetime format
    const now = new Date();
    const future = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const depStr = now.toISOString().slice(0, 16);
    const arrStr = future.toISOString().slice(0, 16);

    this.tripForm.reset({
      busId: defaultBus,
      routeId: defaultRoute,
      departure: depStr,
      arrivalTime: arrStr,
      price: 50,
      status: 'SCHEDULED',
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(trip: BusTripDTO): void {
    this.isEditMode.set(true);
    this.editingTripId.set(trip.id);

    const rawDep = trip.departureTime || trip.departure || '';
    const rawArr = trip.arrivalTime || '';
    const depStr = rawDep ? rawDep.slice(0, 16) : '';
    const arrStr = rawArr ? rawArr.slice(0, 16) : '';

    this.tripForm.patchValue({
      busId: trip.busId,
      routeId: trip.routeId,
      departure: depStr,
      arrivalTime: arrStr,
      price: trip.price,
      status: trip.status,
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.tripForm.reset();
  }

  saveTrip(): void {
    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required trip details correctly.',
        life: 4000,
      });
      return;
    }

    const formVal = this.tripForm.getRawValue();

    if (new Date(formVal.departure) >= new Date(formVal.arrivalTime)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Timetable',
        detail: 'Arrival time must be strictly after departure time.',
        life: 4000,
      });
      return;
    }

    this.saving.set(true);

    const formatLocalDateTime = (val: string): string => {
      if (!val) return '';
      const str = String(val).trim();
      return str.length === 16 ? `${str}:00` : str;
    };

    const payload: BusTripRequestDTO = {
      busId: Number(formVal.busId),
      routeId: Number(formVal.routeId),
      departureTime: formatLocalDateTime(formVal.departure),
      arrivalTime: formatLocalDateTime(formVal.arrivalTime),
      price: Number(formVal.price),
      status: formVal.status as status,
    };

    if (this.isEditMode()) {
      const id = this.editingTripId();
      if (!id) {
        this.saving.set(false);
        return;
      }

      this.busTripService
        .updateBusTrip(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Trip Updated',
              detail: `Trip #${id} has been updated.`,
              life: 4000,
            });
            this.allBusTripsCache.set(null);
            this.handleFilterChange();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to update bus trip.';
            this.messageService.add({
              severity: 'error',
              summary: 'Update Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    } else {
      this.busTripService
        .createBusTrip(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            created.busId = created.busId || payload.busId;
            created.routeId = created.routeId || payload.routeId;
            this.messageService.add({
              severity: 'success',
              summary: 'Trip Scheduled',
              detail: `Trip #${created.id} has been created.`,
              life: 4000,
            });
            this.currentPage.set(0);
            this.allBusTripsCache.set(null);
            this.handleFilterChange();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to schedule bus trip.';
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
  openDeleteDialog(trip: BusTripDTO): void {
    this.tripToDelete.set(trip);
    this.deleteDialogVisible.set(true);
  }

  closeDeleteDialog(): void {
    this.deleteDialogVisible.set(false);
    this.tripToDelete.set(null);
  }

  confirmDeleteTrip(): void {
    const trip = this.tripToDelete();
    if (!trip) return;

    this.deleting.set(true);
    this.busTripService
      .deleteBusTrip(trip.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.tripToDelete.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Trip Deleted',
            detail: `Trip #${trip.id} has been removed.`,
            life: 4000,
          });

          if (this.trips().length === 1 && this.currentPage() > 0) {
            this.currentPage.update((p) => p - 1);
          }
          this.allBusTripsCache.set(null);
          this.handleFilterChange();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = err?.message || 'Failed to delete bus trip.';
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
