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
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { AuthService } from '../../../core/services/auth.service';
import { HotelBookingDTO } from '../../../core/models/Hotel/hotel-booking.model';

@Component({
  selector: 'app-hotel-bookings',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterLink, ToastModule],
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
}
