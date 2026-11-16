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
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageService } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { AuthService } from '../../../core/services/auth.service';
import { HotelBookingDTO } from '../../../core/models/Hotel/hotel-booking.model';
import { calculateGuestBreakdown, GuestBreakdown } from '../../../core/utils/guest-rules.util';

@Component({
  selector: 'app-hotel-bookings',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterLink, ToastModule, FormsModule, SelectButtonModule, TranslatePipe],
  providers: [MessageService],
  templateUrl: './hotel-bookings.component.html',
  styleUrl: './hotel-bookings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelBookingsComponent implements OnInit, OnDestroy {
  private readonly hotelBookingService = inject(HotelBookingService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService, { optional: true });
  private readonly destroy$ = new Subject<void>();

  readonly bookings = signal<HotelBookingDTO[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly totalCount = computed(() => this.bookings().length);

  readonly selectedStatus = signal<string>('ALL');

  readonly statusOptions = computed(() => {
    const list = this.bookings();
    const pendingCount = list.filter((b) => b.status === 'PENDING').length;
    const confirmedCount = list.filter((b) => b.status === 'CONFIRMED').length;
    const completedCount = list.filter((b) => b.status === 'COMPLETED').length;
    const cancelledCount = list.filter((b) => b.status === 'CANCELLED').length;

    const allLabel = this.translate?.instant('myHotelBookings.status.all') || 'All';
    const pendingLabel = this.translate?.instant('myHotelBookings.status.pending') || 'Pending';
    const confirmedLabel = this.translate?.instant('myHotelBookings.status.confirmed') || 'Confirmed';
    const completedLabel = this.translate?.instant('myHotelBookings.status.completed') || 'Completed';
    const cancelledLabel = this.translate?.instant('myHotelBookings.status.cancelled') || 'Cancelled';

    return [
      { label: `${allLabel} (${list.length})`, value: 'ALL' },
      { label: `${pendingLabel} (${pendingCount})`, value: 'PENDING' },
      { label: `${confirmedLabel} (${confirmedCount})`, value: 'CONFIRMED' },
      { label: `${completedLabel} (${completedCount})`, value: 'COMPLETED' },
      { label: `${cancelledLabel} (${cancelledCount})`, value: 'CANCELLED' },
    ];
  });

  readonly filteredBookings = computed(() => {
    const status = this.selectedStatus();
    const list = this.bookings();
    if (!status || status === 'ALL') {
      return list;
    }
    return list.filter((b) => b.status?.toUpperCase() === status.toUpperCase());
  });

  readonly filteredCount = computed(() => this.filteredBookings().length);

  onStatusChange(newStatus: string): void {
    this.selectedStatus.set(newStatus || 'ALL');
  }

  resetStatusFilter(): void {
    this.selectedStatus.set('ALL');
  }

  getStatusLabel(status: string): string {
    const key = `myHotelBookings.status.${status?.toLowerCase()}`;
    const translated = this.translate?.instant(key);
    if (translated && translated !== key) {
      return translated;
    }
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'Pending';
      case 'CONFIRMED':
        return 'Confirmed';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'All';
    }
  }

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
    const key = `myHotelBookings.statusDesc.${status?.toLowerCase()}`;
    const translated = this.translate?.instant(key);
    if (translated && translated !== key) {
      return translated;
    }
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

  getGuestBreakdown(booking: HotelBookingDTO): GuestBreakdown {
    return calculateGuestBreakdown(booking);
  }
}
