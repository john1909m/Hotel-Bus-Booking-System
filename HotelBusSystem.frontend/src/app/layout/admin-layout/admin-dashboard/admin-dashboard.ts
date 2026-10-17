import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

// Core Services
import { AuthService } from '../../../core/services/auth.service';
import { HotelService } from '../../../core/services/hotel.service';
import { RoomService } from '../../../core/services/room.service';
import { UserService } from '../../../core/services/user.service';
import { BusService } from '../../../core/services/bus.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusRouteService } from '../../../core/services/bus-route.service';
import { BusTripService } from '../../../core/services/bus-trip.service';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { PaymentService } from '../../../core/services/payment.service';

export interface DashboardMetrics {
  hotelsCount: number | null;
  roomsCount: number | null;
  usersCount: number | null;
  busesCount: number | null;
  busStopsCount: number | null;
  busRoutesCount: number | null;
  busTripsCount: number | null;
  hotelBookingsCount: number | null;
  busBookingsCount: number | null;
  paymentsCount: number | null;
  totalRevenue: number | null;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly hotelService = inject(HotelService);
  private readonly roomService = inject(RoomService);
  private readonly userService = inject(UserService);
  private readonly busService = inject(BusService);
  private readonly busStopService = inject(BusStopService);
  private readonly busRouteService = inject(BusRouteService);
  private readonly busTripService = inject(BusTripService);
  private readonly hotelBookingService = inject(HotelBookingService);
  private readonly busBookingService = inject(BusBookingService);
  private readonly paymentService = inject(PaymentService);

  private readonly destroy$ = new Subject<void>();

  readonly currentUser = this.authService.currentUser;
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly stats = signal<DashboardMetrics>({
    hotelsCount: null,
    roomsCount: null,
    usersCount: null,
    busesCount: null,
    busStopsCount: null,
    busRoutesCount: null,
    busTripsCount: null,
    hotelBookingsCount: null,
    busBookingsCount: null,
    paymentsCount: null,
    totalRevenue: null,
  });

  ngOnInit(): void {
    this.refreshStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshStats(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      hotels: this.hotelService.getHotels({ size: 1 }).pipe(catchError(() => of(null))),
      rooms: this.roomService.getAllRooms().pipe(catchError(() => of(null))),
      users: this.userService.getUsers({ size: 1 }).pipe(catchError(() => of(null))),
      buses: this.busService.getAllBuses({ size: 1 }).pipe(catchError(() => of(null))),
      busStops: this.busStopService.getAllBusStops({ size: 1 }).pipe(catchError(() => of(null))),
      busRoutes: this.busRouteService.getAllBusRoutes({ size: 1 }).pipe(catchError(() => of(null))),
      busTrips: this.busTripService.getAllBusTrips({ size: 1 }).pipe(catchError(() => of(null))),
      hotelBookings: this.hotelBookingService.getAllHotelBookings({ size: 1 }).pipe(catchError(() => of(null))),
      busBookings: this.busBookingService.getAllBusBookings({ size: 1 }).pipe(catchError(() => of(null))),
      payments: this.paymentService.getPayments().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          let revenue: number | null = null;
          if (Array.isArray(results.payments)) {
            revenue = results.payments
              .filter(p => p.paymentStatus === 'COMPLETED')
              .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          }

          this.stats.set({
            hotelsCount: results.hotels?.totalElements ?? null,
            roomsCount: Array.isArray(results.rooms) ? results.rooms.length : null,
            usersCount: results.users?.totalElements ?? null,
            busesCount: results.buses?.totalElements ?? null,
            busStopsCount: results.busStops?.totalElements ?? null,
            busRoutesCount: results.busRoutes?.totalElements ?? null,
            busTripsCount: results.busTrips?.totalElements ?? null,
            hotelBookingsCount: results.hotelBookings?.totalElements ?? null,
            busBookingsCount: results.busBookings?.totalElements ?? null,
            paymentsCount: Array.isArray(results.payments) ? results.payments.length : null,
            totalRevenue: revenue,
          });

          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(
            err?.message || 'Could not refresh some dashboard metrics. Check connection to the backend.'
          );
        },
      });
  }
}
