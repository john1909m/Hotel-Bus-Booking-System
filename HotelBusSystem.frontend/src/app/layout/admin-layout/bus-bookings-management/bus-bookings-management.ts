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
import { Subject, takeUntil } from 'rxjs';

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
import { BusBookingDTO, BusBookingRequestDTO, Status } from '../../../core/models/Bus/bus-booking.model';
import { BusTripDTO } from '../../../core/models/Bus/bus-trip.model';
import { PageBusBookingDTO, BusBookingListParams } from '../../../core/models/Pagination/busBookingPage.model';

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
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  readonly bookings = signal<BusBookingDTO[]>([]);
  readonly trips = signal<BusTripDTO[]>([]);
  readonly pageData = signal<PageBusBookingDTO | null>(null);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchFilter = signal<string>('');
  readonly sortDirection = signal<string>('desc');
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

  // ── Dialog Signals ─────────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingBookingId = signal<number | null>(null);

  readonly deleteDialogVisible = signal<boolean>(false);
  readonly bookingToDelete = signal<BusBookingDTO | null>(null);

  readonly totalElements = computed(() => this.pageData()?.totalElements ?? 0);
  readonly firstRow = computed(() => this.currentPage() * this.pageSize());

  readonly displayedBookings = computed(() => {
    const q = this.searchFilter().trim().toLowerCase();
    const list = this.bookings();
    if (!q) return list;
    return list.filter(
      (b) =>
        String(b.id).includes(q) ||
        String(b.busTripId).includes(q) ||
        String(b.userId).includes(q) ||
        String(b.seatId).includes(q)
    );
  });

  // ── Reactive Form ──────────────────────────────────────────
  readonly bookingForm: FormGroup = this.fb.group({
    busTripId: [null, [Validators.required]],
    userId: [1, [Validators.required, Validators.min(1)]],
    seatId: [1, [Validators.required, Validators.min(1)]],
    price: [25, [Validators.required, Validators.min(0)]],
    status: ['CONFIRMED', [Validators.required]],
    bookingDate: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadTripsLookup();
    this.loadBookings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTripsLookup(): void {
    this.busTripService
      .lookupBusTrips()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.trips.set(Array.isArray(data) ? data : []),
        error: () => this.trips.set([]),
      });
  }

  loadBookings(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: BusBookingListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: 'id',
      sortDirection: this.sortDirection(),
    };

    this.bookingService
      .getAllBusBookings(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.bookings.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load bus bookings from backend.';
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
      price: 25,
      status: 'CONFIRMED',
      bookingDate: dateStr,
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(b: BusBookingDTO): void {
    this.isEditMode.set(true);
    this.editingBookingId.set(b.id);

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
        detail: 'Please check all required booking parameters.',
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

      this.bookingService
        .updateBusBooking(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Booking Updated',
              detail: `Bus booking #${id} has been updated.`,
              life: 4000,
            });
            this.loadBookings();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to update bus booking.';
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
            const msg = err?.message || 'Failed to create bus booking.';
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
            summary: 'Booking Deleted',
            detail: `Bus booking #${booking.id} has been deleted.`,
            life: 4000,
          });

          if (this.bookings().length === 1 && this.currentPage() > 0) {
            this.currentPage.update((p) => p - 1);
          }
          this.loadBookings();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = err?.message || 'Failed to delete bus booking.';
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
