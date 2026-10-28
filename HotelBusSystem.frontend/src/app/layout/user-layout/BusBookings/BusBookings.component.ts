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
import { Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

// PrimeNG Modules
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

// Core Services & Models
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { BusTripService } from '../../../core/services/bus-trip.service';
import { BusRouteService } from '../../../core/services/bus-route.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusService } from '../../../core/services/bus.service';
import { AuthService } from '../../../core/services/auth.service';

import { BusBookingDTO, BusBookingRequestDTO, Status } from '../../../core/models/Bus/bus-booking.model';
import { BusTripDTO } from '../../../core/models/Bus/bus-trip.model';
import { BusRouteDTO } from '../../../core/models/Bus/bus-route';
import { BusStopDto } from '../../../core/models/Bus/bus-stop.model';
import { BusSeatDTO } from '../../../core/models/Bus/bus-seat.model';
import { BusDTO } from '../../../core/models/Bus/bus.model';

@Component({
  selector: 'app-bus-bookings',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    DatePipe,
    RouterLink,
    DialogModule,
    ButtonModule,
    ToastModule,
    TagModule,
  ],
  providers: [MessageService],
  templateUrl: './BusBookings.component.html',
  styleUrls: ['./BusBookings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusBookingsComponent implements OnInit, OnDestroy {
  private readonly busBookingService = inject(BusBookingService);
  private readonly busTripService = inject(BusTripService);
  private readonly busRouteService = inject(BusRouteService);
  private readonly busStopService = inject(BusStopService);
  private readonly busSeatService = inject(BusSeatService);
  private readonly busService = inject(BusService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  // State Signals
  readonly bookings = signal<BusBookingDTO[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  // Supplementary Entity Lookup Maps
  readonly tripsMap = signal<Map<number, BusTripDTO>>(new Map());
  readonly routesMap = signal<Map<number, BusRouteDTO>>(new Map());
  readonly stopsMap = signal<Map<number, BusStopDto>>(new Map());
  readonly seatsMap = signal<Map<number, BusSeatDTO>>(new Map());
  readonly busesMap = signal<Map<number, BusDTO>>(new Map());

  // Cancellation Signals
  readonly cancelDialogVisible = signal<boolean>(false);
  readonly bookingToCancel = signal<BusBookingDTO | null>(null);
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

    this.busBookingService
      .getMyBusBookings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const list = Array.isArray(data) ? [...data] : [];
          // Sort newest first by booking ID
          list.sort((a, b) => b.id - a.id);
          this.bookings.set(list);
          this.loading.set(false);
          this.enrichBookings(list);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err?.message ||
              'Unable to load your bus bookings. Please check your network connection and try again.'
          );
        },
      });
  }

  /**
   * Efficiently loads supplementary trip, route, bus stop, and seat details
   * in the background, caching each unique ID to avoid redundant requests.
   */
  private enrichBookings(bookings: BusBookingDTO[]): void {
    if (!bookings.length) return;

    // 1. Fetch unique seats
    const uniqueSeatIds = [
      ...new Set(bookings.map((b) => b.seatId).filter((id): id is number => id != null)),
    ];
    uniqueSeatIds.forEach((seatId) => {
      if (this.seatsMap().has(seatId)) return;
      this.busSeatService
        .getBusSeatById(seatId)
        .pipe(
          takeUntil(this.destroy$),
          catchError(() => of(null))
        )
        .subscribe((seat) => {
          if (seat) {
            this.seatsMap.update((m) => new Map(m).set(seatId, seat));
          }
        });
    });

    // 2. Fetch unique bus trips
    const uniqueTripIds = [
      ...new Set(bookings.map((b) => b.busTripId).filter((id): id is number => id != null)),
    ];
    uniqueTripIds.forEach((tripId) => {
      if (this.tripsMap().has(tripId)) return;
      this.busTripService
        .getBusTripById(tripId)
        .pipe(
          takeUntil(this.destroy$),
          catchError(() => of(null))
        )
        .subscribe((trip) => {
          if (trip) {
            this.tripsMap.update((m) => new Map(m).set(tripId, trip));

            // Fetch Route if routeId is present
            if (trip.routeId && !this.routesMap().has(trip.routeId)) {
              this.busRouteService
                .getBusRouteById(trip.routeId)
                .pipe(
                  takeUntil(this.destroy$),
                  catchError(() => of(null))
                )
                .subscribe((route) => {
                  if (route) {
                    this.routesMap.update((m) => new Map(m).set(trip.routeId, route));

                    // Fetch Origin Stop
                    if (route.originStopId && !this.stopsMap().has(route.originStopId)) {
                      this.busStopService
                        .getBusStopById(route.originStopId)
                        .pipe(
                          takeUntil(this.destroy$),
                          catchError(() => of(null))
                        )
                        .subscribe((stop) => {
                          if (stop) {
                            this.stopsMap.update((m) => new Map(m).set(route.originStopId, stop));
                          }
                        });
                    }

                    // Fetch Destination Stop
                    if (route.destinationStopId && !this.stopsMap().has(route.destinationStopId)) {
                      this.busStopService
                        .getBusStopById(route.destinationStopId)
                        .pipe(
                          takeUntil(this.destroy$),
                          catchError(() => of(null))
                        )
                        .subscribe((stop) => {
                          if (stop) {
                            this.stopsMap.update((m) => new Map(m).set(route.destinationStopId, stop));
                          }
                        });
                    }
                  }
                });
            }

            // Fetch Bus if busId is present
            if (trip.busId && !this.busesMap().has(trip.busId)) {
              this.busService
                .getBusById(trip.busId)
                .pipe(
                  takeUntil(this.destroy$),
                  catchError(() => of(null))
                )
                .subscribe((bus) => {
                  if (bus) {
                    this.busesMap.update((m) => new Map(m).set(trip.busId, bus));
                  }
                });
            }
          }
        });
    });
  }

  // ── Lookup Getters for Template ────────────────────────────
  getTrip(tripId: number): BusTripDTO | undefined {
    return this.tripsMap().get(tripId);
  }

  getDepartureTime(tripId: number): string | null {
    const trip = this.getTrip(tripId);
    return trip?.departureTime || trip?.departure || null;
  }

  getArrivalTime(tripId: number): string | null {
    const trip = this.getTrip(tripId);
    return trip?.arrivalTime || null;
  }

  getRouteForTrip(tripId: number): BusRouteDTO | undefined {
    const trip = this.getTrip(tripId);
    return trip?.routeId ? this.routesMap().get(trip.routeId) : undefined;
  }

  getOriginStop(tripId: number): BusStopDto | undefined {
    const route = this.getRouteForTrip(tripId);
    return route?.originStopId ? this.stopsMap().get(route.originStopId) : undefined;
  }

  getDestinationStop(tripId: number): BusStopDto | undefined {
    const route = this.getRouteForTrip(tripId);
    return route?.destinationStopId ? this.stopsMap().get(route.destinationStopId) : undefined;
  }

  getSeat(seatId: number): BusSeatDTO | undefined {
    return this.seatsMap().get(seatId);
  }

  getBusForTrip(tripId: number): BusDTO | undefined {
    const trip = this.getTrip(tripId);
    return trip?.busId ? this.busesMap().get(trip.busId) : undefined;
  }

  getRouteDisplayName(tripId: number): string {
    const route = this.getRouteForTrip(tripId);
    const origin = this.getOriginStop(tripId);
    const dest = this.getDestinationStop(tripId);

    if (origin && dest) {
      const origCity = origin.city || origin.name;
      const destCity = dest.city || dest.name;
      return `${origCity} → ${destCity}`;
    }
    if (route?.name) {
      return route.name;
    }
    return `Bus Trip #${tripId}`;
  }

  getSeatDisplayName(seatId: number): string {
    const seat = this.getSeat(seatId);
    if (!seat) return `Seat #${seatId}`;
    return `Seat ${seat.seatNumber}${seat.seatType ? ' (' + seat.seatType + ')' : ''}`;
  }

  getBusDisplayName(tripId: number): string {
    const bus = this.getBusForTrip(tripId);
    if (!bus) return 'Intercity Coach';
    return `${bus.company} · Bus #${bus.busNumber}${bus.busType ? ' (' + bus.busType + ')' : ''}`;
  }

  formatDuration(durationMinutes: number | null | undefined): string | null {
    if (!durationMinutes || durationMinutes <= 0) return null;
    const hrs = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${mins}m`;
  }

  // ── Status Badges & Descriptions ───────────────────────────
  getStatusSeverity(status: Status | string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    switch (status?.toUpperCase()) {
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

  getStatusDescription(status: Status | string): string {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return 'Travel reservation confirmed & seat guaranteed';
      case 'PENDING':
        return 'Reservation awaiting confirmation';
      case 'CANCELLED':
        return 'Travel booking has been cancelled';
      case 'COMPLETED':
        return 'Journey completed';
      default:
        return status || 'Reservation recorded';
    }
  }

  // ── Cancellation Logic ─────────────────────────────────────
  /**
   * Only PENDING and CONFIRMED bookings may be cancelled per backend allowed transitions:
   * PENDING -> CANCELLED, CONFIRMED -> CANCELLED.
   * COMPLETED and already CANCELLED bookings cannot be cancelled.
   */
  canCancelBooking(b: BusBookingDTO): boolean {
    if (!b) return false;
    const st = b.status?.toUpperCase();
    if (st !== 'PENDING' && st !== 'CONFIRMED') {
      return false;
    }

    // Ownership validation: user can only cancel their own booking
    const currentUserId = this.authService.currentUser()?.id;
    if (currentUserId && b.userId && b.userId !== currentUserId) {
      return false;
    }

    return true;
  }

  openCancelDialog(b: BusBookingDTO): void {
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

    // Backend Source of Truth:
    // PUT /api/bus-bookings/{id} accepts BusBookingRequestDto and validates ownership (isOwnerOrAdmin)
    // and allowed status transitions (PENDING|CONFIRMED -> CANCELLED).
    const payload: BusBookingRequestDTO = {
      bookingDate: booking.bookingDate,
      status: 'CANCELLED',
      price: booking.price,
      userId: booking.userId,
      busTripId: booking.busTripId,
      seatId: booking.seatId,
    };

    this.busBookingService
      .updateBusBooking(booking.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedBooking) => {
          this.isCancelling.set(false);
          this.cancelDialogVisible.set(false);
          this.bookingToCancel.set(null);

          // Update booking status in local reactive state
          const newStatus = updatedBooking.status || 'CANCELLED';
          this.bookings.update((list) =>
            list.map((item) => (item.id === booking.id ? { ...item, status: newStatus } : item))
          );

          this.messageService.add({
            severity: 'success',
            summary: 'Booking Cancelled',
            detail: `Bus booking #${booking.id} has been successfully cancelled.`,
            life: 5000,
          });
        },
        error: (err) => {
          this.isCancelling.set(false);
          const msg = err?.message || 'Failed to cancel bus booking. Please try again.';
          this.cancelErrorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Cancellation Failed',
            detail: msg,
            life: 5000,
          });
        },
      });
  }
}
