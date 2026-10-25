import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { AuthService } from '../../../core/services/auth.service';
import { HotelBookingDTO } from '../../../core/models/Hotel/hotel-booking.model';

@Component({
  selector: 'app-hotel-bookings',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterLink, DialogModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './hotel-bookings.component.html',
  styleUrl: './hotel-bookings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelBookingsComponent implements OnInit, OnDestroy {
  private readonly hotelBookingService = inject(HotelBookingService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  readonly bookings = signal<HotelBookingDTO[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  // Cancellation Signals
  readonly cancelDialogVisible = signal<boolean>(false);
  readonly bookingToCancel = signal<HotelBookingDTO | null>(null);
  readonly isCancelling = signal<boolean>(false);
  readonly cancelErrorMessage = signal<string | null>(null);

  readonly totalCount = computed(() => this.bookings().length);

  ngOnInit(): void {
    this.loadMyBookings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMyBookings(): void {
    this.loading.set(true);
    this.error.set(null);

    this.hotelBookingService
      .getMyHotelBookings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Sort with newest bookings first (by id descending)
          const list = Array.isArray(data) ? [...data] : [];
          list.sort((a, b) => b.id - a.id);
          this.bookings.set(list);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err?.message ||
              'Unable to load your hotel reservations. Please check your network connection and try again.'
          );
        },
      });
  }

  calculateNights(checkIn: string, checkOut: string): number | null {
    if (!checkIn || !checkOut) return null;
    const dIn = new Date(checkIn);
    const dOut = new Date(checkOut);
    if (isNaN(dIn.getTime()) || isNaN(dOut.getTime())) return null;
    const diff = dOut.getTime() - dIn.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : null;
  }

  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return 'status-badge--confirmed';
      case 'PENDING':
        return 'status-badge--pending';
      case 'CANCELLED':
        return 'status-badge--cancelled';
      case 'COMPLETED':
        return 'status-badge--completed';
      default:
        return 'status-badge--default';
    }
  }

  getStatusDescription(status: string): string {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return 'Reservation confirmed by the property';
      case 'PENDING':
        return 'Booking received; awaiting confirmation or next step';
      case 'CANCELLED':
        return 'Reservation was cancelled';
      case 'COMPLETED':
        return 'Stay completed';
      default:
        return status || 'Reservation placed';
    }
  }

  canCancelBooking(b: HotelBookingDTO): boolean {
    if (!b || b.status !== 'PENDING') return false;
    // Ownership check: user can only cancel their own booking
    const currentUserId = this.authService.currentUser()?.id;
    if (currentUserId && b.userId && b.userId !== currentUserId) {
      return false;
    }
    if (!b.checkIn) return true;
    const todayStr = new Date().toISOString().slice(0, 10);
    return b.checkIn >= todayStr;
  }

  openCancelDialog(b: HotelBookingDTO): void {
    if (!this.canCancelBooking(b)) return;
    this.bookingToCancel.set(b);
    this.cancelErrorMessage.set(null);
    this.cancelDialogVisible.set(true);
  }

  closeCancelDialog(): void {
    this.cancelDialogVisible.set(false);
    this.bookingToCancel.set(null);
    this.cancelErrorMessage.set(null);
  }

  confirmCancel(): void {
    const booking = this.bookingToCancel();
    if (!booking || !this.canCancelBooking(booking) || this.isCancelling()) return;

    this.isCancelling.set(true);
    this.cancelErrorMessage.set(null);

    // Business Logic & Contract Verification:
    // When a user cancels an eligible booking:
    // - Status must change from PENDING to CANCELLED.
    // - The booking must remain in the database (DELETE is strictly prohibited for user cancellations).
    // - Cancellation must be persisted by the backend, not simulated in Angular.
    // - If no existing supported API can persist the status change, report this as a backend limitation.
    //
    // Backend investigation confirms that HotelBookingController only provides DELETE (physical deletion)
    // and PUT (which takes HotelBookingRequestDto, lacking a status field). No backend endpoint exists
    // to transition hotel booking status to CANCELLED without hard deletion.
    setTimeout(() => {
      this.isCancelling.set(false);
      const msg = 'Cancellation unavailable: The backend API lacks a non-destructive cancellation endpoint to update booking status to CANCELLED. Permanent database deletion is reserved for administrators and cannot be performed for user cancellations. Please contact property administration.';
      this.cancelErrorMessage.set(msg);
      this.messageService.add({
        severity: 'warn',
        summary: 'Backend Capability Missing',
        detail: 'The backend does not currently support status transitions to CANCELLED for hotel bookings.',
        life: 7000,
      });
    }, 450);
  }
}
