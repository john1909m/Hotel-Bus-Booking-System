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
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { RoomService } from '../../../core/services/room.service';
import { HotelBookingDTO, HotelBookingRequestDTO, status } from '../../../core/models/Hotel/hotel-booking.model';
import { RoomDTO } from '../../../core/models/Room/room.model';
import { PageHotelBookingDTO, HotelBookingListParams } from '../../../core/models/Pagination/hotelBookingPage.model';

@Component({
  selector: 'app-hotel-bookings-management',
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
  templateUrl: './hotel-bookings-management.html',
  styleUrl: './hotel-bookings-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelBookingsManagement implements OnInit, OnDestroy {
  private readonly bookingService = inject(HotelBookingService);
  private readonly roomService = inject(RoomService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  readonly bookings = signal<HotelBookingDTO[]>([]);
  readonly rooms = signal<RoomDTO[]>([]);
  readonly pageData = signal<PageHotelBookingDTO | null>(null);
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
  readonly bookingToDelete = signal<HotelBookingDTO | null>(null);

  readonly totalElements = computed(() => {
    const page = this.pageData();
    return page?.page?.totalElements ?? page?.totalElements ?? 0;
  });
  readonly firstRow = computed(() => this.currentPage() * this.pageSize());

  readonly displayedBookings = computed(() => {
    const q = this.searchFilter().trim().toLowerCase();
    const list = this.bookings();
    if (!q) return list;
    return list.filter(
      (b) =>
        (b.hotelName && b.hotelName.toLowerCase().includes(q)) ||
        String(b.id).includes(q) ||
        String(b.userId).includes(q) ||
        String(b.roomId).includes(q)
    );
  });

  readonly availableStatuses: readonly status[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
  readonly selectedHotelName = signal<string>('');
  readonly statusFilter = signal<string>('ANY');
  readonly updatingStatusId = signal<number | null>(null);
  readonly initialEditingStatus = signal<status | string>('PENDING');

  // ── Reactive Form ──────────────────────────────────────────
  readonly bookingForm: FormGroup = this.fb.group({
    roomId: [null, [Validators.required]],
    guests: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
    checkIn: ['', [Validators.required]],
    checkOut: ['', [Validators.required]],
    status: ['PENDING', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadRoomsLookup();
    this.loadBookings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRoomsLookup(): void {
    this.roomService
      .getAllRooms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.rooms.set(Array.isArray(data) ? data : []),
        error: () => this.rooms.set([]),
      });
  }

  loadBookings(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: HotelBookingListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: 'id',
      sortDirection: this.sortDirection(),
      status: this.statusFilter(),
    };

    this.bookingService
      .getAllHotelBookings(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.bookings.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load hotel bookings from backend.';
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

  onStatusFilterChange(val: string): void {
    this.statusFilter.set(val);
    this.currentPage.set(0);
    this.loadBookings();
  }

  confirmBookingStatus(booking: HotelBookingDTO): void {
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

    this.updatingStatusId.set(booking.id);

    this.bookingService
      .updateHotelBookingStatus(booking.id, 'CONFIRMED')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedBooking) => {
          this.updatingStatusId.set(null);
          const nextStatus = updatedBooking.status || 'CONFIRMED';
          this.bookings.update((list) =>
            list.map((item) =>
              item.id === booking.id ? { ...item, status: nextStatus } : item
            )
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Booking Confirmed',
            detail: `Hotel booking #${booking.id} has been successfully transitioned to CONFIRMED.`,
            life: 4000,
          });
        },
        error: (err) => {
          this.updatingStatusId.set(null);
          const msg = err?.message || 'Failed to update hotel booking status.';
          this.messageService.add({
            severity: 'error',
            summary: 'Status Update Failed',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  getAllowedStatuses(currentStatus?: status | string): readonly status[] {
    switch (currentStatus) {
      case 'PENDING':
        return ['PENDING', 'CONFIRMED', 'CANCELLED'];
      case 'CONFIRMED':
        return ['CONFIRMED', 'COMPLETED', 'CANCELLED'];
      case 'COMPLETED':
        return ['COMPLETED'];
      case 'CANCELLED':
        return ['CANCELLED'];
      default:
        return ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
    }
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

  getStatusSeverity(s: status | string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
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

  getRoomLabel(roomId: number): string {
    const found = this.rooms().find((r) => r.id === roomId);
    return found ? `Room ${found.roomNumber} (${found.roomType})` : `Room #${roomId}`;
  }

  // ── Create & Edit Handlers ─────────────────────────────────
  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.editingBookingId.set(null);
    this.selectedHotelName.set('');

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const inStr = today.toISOString().slice(0, 10);
    const outStr = tomorrow.toISOString().slice(0, 10);

    const defaultRoom = this.rooms().length > 0 ? this.rooms()[0].id : null;

    this.bookingForm.reset({
      roomId: defaultRoom,
      guests: 1,
      checkIn: inStr,
      checkOut: outStr,
      status: 'PENDING',
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(b: HotelBookingDTO): void {
    this.isEditMode.set(true);
    this.editingBookingId.set(b.id);
    this.initialEditingStatus.set(b.status || 'PENDING');

    // Resolve the hotel's actual name
    const foundRoom = this.rooms().find((r) => r.id === b.roomId);
    const resolvedName =
      b.hotelName ||
      (b.hotelId
        ? `Hotel #${b.hotelId}`
        : foundRoom
        ? `Hotel #${foundRoom.hotelId}`
        : 'Hotel Property');
    this.selectedHotelName.set(resolvedName);

    const inStr = b.checkIn ? b.checkIn.slice(0, 10) : '';
    const outStr = b.checkOut ? b.checkOut.slice(0, 10) : '';

    this.bookingForm.patchValue({
      roomId: b.roomId,
      guests: b.guests,
      checkIn: inStr,
      checkOut: outStr,
      status: b.status || 'PENDING',
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
        detail: 'Please fill in all required booking fields correctly.',
        life: 4000,
      });
      return;
    }

    const formVal = this.bookingForm.getRawValue();

    if (new Date(formVal.checkIn) >= new Date(formVal.checkOut)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Dates',
        detail: 'Check-out date must be strictly after check-in date.',
        life: 4000,
      });
      return;
    }

    this.saving.set(true);

    const payload: HotelBookingRequestDTO = {
      roomId: Number(formVal.roomId),
      guests: Number(formVal.guests),
      checkIn: String(formVal.checkIn),
      checkOut: String(formVal.checkOut),
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
        .updateHotelBooking(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            if (statusChanged) {
              this.bookingService
                .updateHotelBookingStatus(id, formVal.status)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: (updatedWithStatus) => {
                    this.saving.set(false);
                    this.dialogVisible.set(false);
                    this.messageService.add({
                      severity: 'success',
                      summary: 'Booking Updated',
                      detail: `Hotel booking #${id} updated with status '${updatedWithStatus.status}'.`,
                      life: 4000,
                    });
                    this.loadBookings();
                  },
                  error: (statusErr) => {
                    this.saving.set(false);
                    this.dialogVisible.set(false);
                    this.messageService.add({
                      severity: 'warn',
                      summary: 'Partial Update',
                      detail: `Booking fields saved, but status update failed: ${statusErr?.message || 'Invalid transition'}.`,
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
                detail: `Hotel booking #${id} has been updated.`,
                life: 4000,
              });
              this.loadBookings();
            }
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to update hotel booking.';
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
        .createHotelBooking(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Booking Created',
              detail: `Hotel booking #${created.id} was created successfully.`,
              life: 4000,
            });
            this.currentPage.set(0);
            this.loadBookings();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to create hotel booking.';
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
  openDeleteDialog(booking: HotelBookingDTO): void {
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
      .deleteHotelBooking(booking.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.bookingToDelete.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Booking Deleted',
            detail: `Hotel booking #${booking.id} has been cancelled/deleted.`,
            life: 4000,
          });

          if (this.bookings().length === 1 && this.currentPage() > 0) {
            this.currentPage.update((p) => p - 1);
          }
          this.loadBookings();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = err?.message || 'Failed to delete hotel booking.';
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
