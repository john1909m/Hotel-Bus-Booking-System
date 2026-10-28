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
import { Subject, takeUntil, of, catchError, forkJoin } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

// Core Models & Services
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { BusTripService } from '../../../core/services/bus-trip.service';
import { BusRouteService } from '../../../core/services/bus-route.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusService } from '../../../core/services/bus.service';
import { UserService } from '../../../core/services/user.service';

import { BusBookingDTO, BusBookingRequestDTO, Status } from '../../../core/models/Bus/bus-booking.model';
import { BusTripDTO } from '../../../core/models/Bus/bus-trip.model';
import { BusRouteDTO } from '../../../core/models/Bus/bus-route';
import { BusStopDto } from '../../../core/models/Bus/bus-stop.model';
import { BusSeatDTO } from '../../../core/models/Bus/bus-seat.model';
import { BusDTO } from '../../../core/models/Bus/bus.model';
import { UserDto } from '../../../core/models/User/user.model';
import { PageBusBookingDTO, BusBookingListParams } from '../../../core/models/Pagination/busBookingPage.model';
import { extractErrorMessage } from '../../../../utils/ErrorHandling';

@Component({
  selector: 'app-bus-bookings-management',
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
  templateUrl: './bus-bookings-management.html',
  styleUrl: './bus-bookings-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusBookingsManagement implements OnInit, OnDestroy {
  private readonly bookingService = inject(BusBookingService);
  private readonly busTripService = inject(BusTripService);
  private readonly busRouteService = inject(BusRouteService);
  private readonly busStopService = inject(BusStopService);
  private readonly busSeatService = inject(BusSeatService);
  private readonly busService = inject(BusService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  // ── Core Data Signals ───────────────────────────────────────
  readonly bookings = signal<BusBookingDTO[]>([]);
  readonly trips = signal<BusTripDTO[]>([]);
  readonly pageData = signal<PageBusBookingDTO | null>(null);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // ── Relational Entity Caches & Reactive Trigger ─────────────
  readonly userCache = new Map<number, UserDto>();
  readonly tripCache = new Map<number, BusTripDTO>();
  readonly routeCache = new Map<number, BusRouteDTO>();
  readonly stopCache = new Map<number, BusStopDto>();
  readonly seatCache = new Map<number, BusSeatDTO>();
  readonly busCache = new Map<number, BusDTO>();
  readonly enrichmentTrigger = signal<number>(0);

  // ── Filters & Pagination Signals ───────────────────────────
  readonly searchFilter = signal<string>('');
  readonly statusFilter = signal<string>('ALL');
  readonly sortDirection = signal<string>('desc');
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

  // ── Details Dialog Signals ─────────────────────────────────
  readonly detailsDialogVisible = signal<boolean>(false);
  readonly selectedBookingForDetails = signal<BusBookingDTO | null>(null);

  // ── Status Transition Dialog Signals ───────────────────────
  readonly statusDialogVisible = signal<boolean>(false);
  readonly bookingForStatusChange = signal<BusBookingDTO | null>(null);
  readonly selectedNewStatus = signal<Status | null>(null);
  readonly statusChanging = signal<boolean>(false);
  readonly updatingStatusId = signal<number | null>(null);

  // ── Create / Edit Dialog Signals ───────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingBookingId = signal<number | null>(null);
  readonly initialEditingStatus = signal<Status | string>('CONFIRMED');

  // ── Permanent Delete Dialog Signals ────────────────────────
  readonly deleteDialogVisible = signal<boolean>(false);
  readonly bookingToDelete = signal<BusBookingDTO | null>(null);

  // ── Computed Properties ────────────────────────────────────
  readonly totalElements = computed(() => {
    const page = this.pageData();
    return page?.page?.totalElements ?? page?.totalElements ?? 0;
  });

  readonly firstRow = computed(() => this.currentPage() * this.pageSize());

  readonly displayedBookings = computed(() => {
    // Read trigger to recompute when enrichment data arrives
    this.enrichmentTrigger();

    const q = this.searchFilter().trim().toLowerCase();
    const list = this.bookings();
    if (!q) return list;

    return list.filter((b) => {
      const idMatch = String(b.id).includes(q);
      const userMatch = String(b.userId).includes(q) || (this.userCache.get(b.userId)?.name?.toLowerCase() || '').includes(q);
      const tripMatch = String(b.busTripId).includes(q) || (this.getTripRouteLabel(b.busTripId).toLowerCase()).includes(q);
      const seatMatch = String(b.seatId).includes(q) || (this.seatCache.get(b.seatId)?.seatNumber?.toLowerCase() || '').includes(q);
      const statusMatch = b.status?.toLowerCase().includes(q);
      return idMatch || userMatch || tripMatch || seatMatch || statusMatch;
    });
  });

  // ── Reactive Form for Create / Edit ────────────────────────
  readonly bookingForm: FormGroup = this.fb.group({
    busTripId: [null, [Validators.required]],
    userId: [1, [Validators.required, Validators.min(1)]],
    seatId: [1, [Validators.required, Validators.min(1)]],
    price: [250, [Validators.required, Validators.min(0)]],
    status: ['CONFIRMED', [Validators.required]],
    bookingDate: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadAllStops();
    this.loadTripsLookup();
    this.loadBookings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads bus stops to resolve station and city names for routes.
   */
  private loadAllStops(): void {
    this.busStopService
      .getAllBusStops({ size: 100 })
      .pipe(
        catchError(() => of({ content: [] as BusStopDto[] })),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        (res?.content || []).forEach((stop) => {
          if (stop && stop.id) {
            this.stopCache.set(stop.id, stop);
          }
        });
        this.enrichmentTrigger.update((n) => n + 1);
      });
  }

  loadTripsLookup(): void {
    this.busTripService
      .lookupBusTrips()
      .pipe(
        catchError(() => of([] as BusTripDTO[])),
        takeUntil(this.destroy$)
      )
      .subscribe((data) => {
        const list = Array.isArray(data) ? data : [];
        this.trips.set(list);
        list.forEach((t) => {
          if (t && t.id) this.tripCache.set(t.id, t);
        });
        this.enrichmentTrigger.update((n) => n + 1);
      });
  }

  /**
   * Loads paginated bus bookings from the backend with server filters.
   */
  loadBookings(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const filterStatus = this.statusFilter();
    const params: BusBookingListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: 'id',
      sortDirection: this.sortDirection(),
      ...(filterStatus !== 'ALL' ? { status: filterStatus } : {}),
    };

    this.bookingService
      .getAllBusBookings(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          const list = page?.content || [];
          this.bookings.set(list);
          this.loading.set(false);
          this.enrichBookings(list);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = extractErrorMessage(err, 'Failed to load bus bookings from backend.');
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Bookings',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  /**
   * Lazily loads related entities (Users, Trips, Routes, Seats, Buses) for the current page.
   */
  private enrichBookings(bookings: BusBookingDTO[]): void {
    if (!bookings || bookings.length === 0) return;

    // 1. Uncached User IDs
    const uncachedUserIds = Array.from(
      new Set(bookings.map((b) => b.userId).filter((id) => id && !this.userCache.has(id)))
    );
    uncachedUserIds.forEach((uid) => {
      this.userService
        .getUserById(uid)
        .pipe(
          catchError(() => of(null)),
          takeUntil(this.destroy$)
        )
        .subscribe((user) => {
          if (user && user.id) {
            this.userCache.set(user.id, user);
            this.enrichmentTrigger.update((n) => n + 1);
          }
        });
    });

    // 2. Uncached Seat IDs
    const uncachedSeatIds = Array.from(
      new Set(bookings.map((b) => b.seatId).filter((id) => id && !this.seatCache.has(id)))
    );
    uncachedSeatIds.forEach((sid) => {
      this.busSeatService
        .getBusSeatById(sid)
        .pipe(
          catchError(() => of(null)),
          takeUntil(this.destroy$)
        )
        .subscribe((seat) => {
          if (seat && seat.id) {
            this.seatCache.set(seat.id, seat);
            this.enrichmentTrigger.update((n) => n + 1);
          }
        });
    });

    // 3. Uncached Trip IDs
    const uncachedTripIds = Array.from(
      new Set(bookings.map((b) => b.busTripId).filter((id) => id && !this.tripCache.has(id)))
    );
    uncachedTripIds.forEach((tid) => {
      this.busTripService
        .getBusTripById(tid)
        .pipe(
          catchError(() => of(null)),
          takeUntil(this.destroy$)
        )
        .subscribe((trip) => {
          if (trip && trip.id) {
            this.tripCache.set(trip.id, trip);
            this.loadTripRouteAndBus(trip);
            this.enrichmentTrigger.update((n) => n + 1);
          }
        });
    });

    // Also ensure existing cached trips have their route & bus cached
    bookings.forEach((b) => {
      const trip = this.tripCache.get(b.busTripId);
      if (trip) {
        this.loadTripRouteAndBus(trip);
      }
    });
  }

  private loadTripRouteAndBus(trip: BusTripDTO): void {
    if (trip.routeId && !this.routeCache.has(trip.routeId)) {
      this.busRouteService
        .getBusRouteById(trip.routeId)
        .pipe(
          catchError(() => of(null)),
          takeUntil(this.destroy$)
        )
        .subscribe((route) => {
          if (route && route.id) {
            this.routeCache.set(route.id, route);
            this.enrichmentTrigger.update((n) => n + 1);
          }
        });
    }

    if (trip.busId && !this.busCache.has(trip.busId)) {
      this.busService
        .getBusById(trip.busId)
        .pipe(
          catchError(() => of(null)),
          takeUntil(this.destroy$)
        )
        .subscribe((bus) => {
          if (bus && bus.id) {
            this.busCache.set(bus.id, bus);
            this.enrichmentTrigger.update((n) => n + 1);
          }
        });
    }
  }

  // ── Helper Lookup Methods ──────────────────────────────────
  getCustomerName(userId: number): string {
    const user = this.userCache.get(userId);
    return user?.name ? `${user.name} (#${userId})` : `Customer #${userId}`;
  }

  getCustomerEmail(userId: number): string {
    return this.userCache.get(userId)?.email || 'N/A';
  }

  getCustomerPhone(userId: number): string {
    return this.userCache.get(userId)?.phoneNumber || 'N/A';
  }

  getTripRouteLabel(busTripId: number): string {
    const trip = this.tripCache.get(busTripId);
    if (!trip) return `Trip #${busTripId}`;

    const route = this.routeCache.get(trip.routeId);
    if (!route) return `Trip #${busTripId} (Route #${trip.routeId})`;

    const orig = this.stopCache.get(route.originStopId)?.city;
    const dest = this.stopCache.get(route.destinationStopId)?.city;

    if (orig && dest) {
      return `${orig} → ${dest}`;
    }
    return `Trip #${busTripId}`;
  }

  getTripDeparture(busTripId: number): string | null {
    const trip = this.tripCache.get(busTripId);
    return trip?.departureTime || trip?.departure || null;
  }

  getSeatNumber(seatId: number): string {
    const seat = this.seatCache.get(seatId);
    return seat?.seatNumber ? seat.seatNumber : `#${seatId}`;
  }

  getSeatType(seatId: number): string {
    return this.seatCache.get(seatId)?.seatType || 'REGULAR';
  }

  getBusCarrier(busTripId: number): string {
    const trip = this.tripCache.get(busTripId);
    if (!trip) return 'Express Carrier';
    const bus = this.busCache.get(trip.busId);
    return bus?.company ? `${bus.company} (#${bus.busNumber || bus.id})` : `Coach #${trip.busId}`;
  }

  getOriginStop(busTripId: number): BusStopDto | null {
    const trip = this.tripCache.get(busTripId);
    if (!trip) return null;
    const route = this.routeCache.get(trip.routeId);
    if (!route) return null;
    return this.stopCache.get(route.originStopId) || null;
  }

  getDestinationStop(busTripId: number): BusStopDto | null {
    const trip = this.tripCache.get(busTripId);
    if (!trip) return null;
    const route = this.routeCache.get(trip.routeId);
    if (!route) return null;
    return this.stopCache.get(route.destinationStopId) || null;
  }

  // ── Filters & Table Actions ────────────────────────────────
  onStatusFilterChange(val: string): void {
    this.statusFilter.set(val);
    this.currentPage.set(0);
    this.loadBookings();
  }

  onSearchFilter(val: string): void {
    this.searchFilter.set(val);
  }

  onDirChange(val: string): void {
    this.sortDirection.set(val);
    this.currentPage.set(0);
    this.loadBookings();
  }

  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.currentPage.set(pageIndex);
    this.loadBookings();
  }

  getStatusSeverity(s: Status | string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (s) {
      case 'CONFIRMED':
        return 'success';
      case 'PENDING':
        return 'warn';
      case 'CANCELLED':
        return 'danger';
      case 'COMPLETED':
        return 'info';
      default:
        return 'secondary';
    }
  }

  // ── Details Dialog Methods ─────────────────────────────────
  openDetailsDialog(booking: BusBookingDTO): void {
    this.selectedBookingForDetails.set(booking);
    this.detailsDialogVisible.set(true);

    // Ensure all relational entities are loaded for this booking
    this.enrichBookings([booking]);
  }

  closeDetailsDialog(): void {
    this.detailsDialogVisible.set(false);
    this.selectedBookingForDetails.set(null);
  }

  // ── Status Transition Logic (Backend Lifecycle Compliant) ───
  /**
   * Allowed transitions per backend rules:
   * PENDING   -> CONFIRMED, CANCELLED
   * CONFIRMED -> COMPLETED, CANCELLED
   * COMPLETED -> none (terminal state)
   * CANCELLED -> none (terminal state)
   */
  getAllowedTransitions(currentStatus?: Status | string): readonly Status[] {
    switch (currentStatus) {
      case 'PENDING':
        return ['CONFIRMED', 'CANCELLED'];
      case 'CONFIRMED':
        return ['COMPLETED', 'CANCELLED'];
      case 'COMPLETED':
      case 'CANCELLED':
      default:
        return [];
    }
  }

  isTerminalStatus(s?: Status | string): boolean {
    return s === 'COMPLETED' || s === 'CANCELLED';
  }

  /**
   * Quick action button on PENDING table rows: PENDING -> CONFIRMED.
   */
  confirmBookingQuick(booking: BusBookingDTO): void {
    if (this.updatingStatusId() !== null) return;

    if (booking.status !== 'PENDING') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Transition',
        detail: `Cannot confirm booking #${booking.id} with status '${booking.status}'. Only PENDING bookings can be transitioned to CONFIRMED.`,
        life: 4000,
      });
      return;
    }

    this.executeStatusUpdate(booking.id, 'CONFIRMED');
  }

  /**
   * Opens the dedicated Status Transition Dialog.
   */
  openStatusChangeDialog(booking: BusBookingDTO, preselected?: Status): void {
    if (this.isTerminalStatus(booking.status)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Terminal State',
        detail: `Booking #${booking.id} is in terminal state '${booking.status}' and cannot transition to any other status.`,
        life: 4000,
      });
      return;
    }

    this.bookingForStatusChange.set(booking);
    const allowed = this.getAllowedTransitions(booking.status);
    const defaultTarget = preselected && allowed.includes(preselected) ? preselected : allowed[0];
    this.selectedNewStatus.set(defaultTarget || null);
    this.statusDialogVisible.set(true);
  }

  closeStatusChangeDialog(): void {
    this.statusDialogVisible.set(false);
    this.bookingForStatusChange.set(null);
    this.selectedNewStatus.set(null);
  }

  submitStatusChange(): void {
    const booking = this.bookingForStatusChange();
    const newStatus = this.selectedNewStatus();
    if (!booking || !newStatus) return;

    this.executeStatusUpdate(booking.id, newStatus);
  }

  /**
   * Calls the existing backend PATCH /api/bus-bookings/{id}/status endpoint.
   */
  executeStatusUpdate(bookingId: number, targetStatus: Status): void {
    this.updatingStatusId.set(bookingId);
    this.statusChanging.set(true);

    this.bookingService
      .updateBusBookingStatus(bookingId, targetStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedBooking) => {
          this.updatingStatusId.set(null);
          this.statusChanging.set(false);
          this.statusDialogVisible.set(false);

          const finalStatus = updatedBooking.status || targetStatus;

          // Update bookings in local signal for immediate UI reactivity
          this.bookings.update((list) =>
            list.map((item) => (item.id === bookingId ? { ...item, status: finalStatus } : item))
          );

          // Update details modal if currently open for this booking
          const currentDetails = this.selectedBookingForDetails();
          if (currentDetails && currentDetails.id === bookingId) {
            this.selectedBookingForDetails.set({ ...currentDetails, status: finalStatus });
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Status Updated',
            detail: `Bus booking #${bookingId} has been successfully transitioned to ${finalStatus}.`,
            life: 4500,
          });
        },
        error: (err) => {
          this.updatingStatusId.set(null);
          this.statusChanging.set(false);
          const msg = extractErrorMessage(err, 'Failed to update bus booking status.');
          this.messageService.add({
            severity: 'error',
            summary: 'Status Update Failed',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  // ── Create & Edit Handlers ─────────────────────────────────
  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.editingBookingId.set(null);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 16);
    const defaultTrip = this.trips().length > 0 ? this.trips()[0].id : null;

    this.bookingForm.reset({
      busTripId: defaultTrip,
      userId: 1,
      seatId: 1,
      price: 250,
      status: 'CONFIRMED',
      bookingDate: dateStr,
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(b: BusBookingDTO): void {
    this.isEditMode.set(true);
    this.editingBookingId.set(b.id);
    this.initialEditingStatus.set(b.status);

    const dateStr = b.bookingDate ? b.bookingDate.slice(0, 16) : '';

    this.bookingForm.patchValue({
      busTripId: b.busTripId,
      userId: b.userId,
      seatId: b.seatId,
      price: b.price,
      status: b.status,
      bookingDate: dateStr,
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.bookingForm.reset();
  }

  saveBooking(): void {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please review all required booking parameters.',
        life: 4000,
      });
      return;
    }

    this.saving.set(true);
    const formVal = this.bookingForm.getRawValue();

    const payload: BusBookingRequestDTO = {
      busTripId: Number(formVal.busTripId),
      userId: Number(formVal.userId),
      seatId: Number(formVal.seatId),
      price: Number(formVal.price),
      status: formVal.status as Status,
      bookingDate: String(formVal.bookingDate),
    };

    if (this.isEditMode()) {
      const id = this.editingBookingId();
      if (!id) {
        this.saving.set(false);
        return;
      }

      const initialStatus = this.initialEditingStatus();
      const statusChanged = formVal.status && formVal.status !== initialStatus;

      this.bookingService
        .updateBusBooking(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            if (statusChanged) {
              this.bookingService
                .updateBusBookingStatus(id, formVal.status)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: (updatedWithStatus) => {
                    this.saving.set(false);
                    this.dialogVisible.set(false);
                    this.messageService.add({
                      severity: 'success',
                      summary: 'Booking Updated',
                      detail: `Bus booking #${id} updated with status '${updatedWithStatus.status}'.`,
                      life: 4000,
                    });
                    this.loadBookings();
                  },
                  error: (statusErr) => {
                    this.saving.set(false);
                    this.dialogVisible.set(false);
                    const msg = extractErrorMessage(statusErr, 'Status transition not permitted.');
                    this.messageService.add({
                      severity: 'warn',
                      summary: 'Partial Update',
                      detail: `Booking fields saved, but status update failed: ${msg}.`,
                      life: 5000,
                    });
                    this.loadBookings();
                  },
                });
            } else {
              this.saving.set(false);
              this.dialogVisible.set(false);
              this.messageService.add({
                severity: 'success',
                summary: 'Booking Updated',
                detail: `Bus booking #${id} has been updated.`,
                life: 4000,
              });
              this.loadBookings();
            }
          },
          error: (err) => {
            this.saving.set(false);
            const msg = extractErrorMessage(err, 'Failed to update bus booking.');
            this.messageService.add({
              severity: 'error',
              summary: 'Update Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    } else {
      this.bookingService
        .createBusBooking(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Booking Created',
              detail: `Bus booking #${created.id} was created successfully.`,
              life: 4000,
            });
            this.currentPage.set(0);
            this.loadBookings();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = extractErrorMessage(err, 'Failed to create bus booking.');
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

  // ── Permanent Deletion Handlers (Admin Record Purge) ────────
  openDeleteDialog(booking: BusBookingDTO): void {
    this.bookingToDelete.set(booking);
    this.deleteDialogVisible.set(true);
  }

  closeDeleteDialog(): void {
    this.deleteDialogVisible.set(false);
    this.bookingToDelete.set(null);
  }

  confirmDeleteBooking(): void {
    const booking = this.bookingToDelete();
    if (!booking) return;

    this.deleting.set(true);
    this.bookingService
      .deleteBusBooking(booking.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.bookingToDelete.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Record Deleted',
            detail: `Bus booking record #${booking.id} has been permanently deleted.`,
            life: 4000,
          });

          if (this.bookings().length === 1 && this.currentPage() > 0) {
            this.currentPage.update((p) => p - 1);
          }
          this.loadBookings();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = extractErrorMessage(err, 'Failed to delete bus booking record.');
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
