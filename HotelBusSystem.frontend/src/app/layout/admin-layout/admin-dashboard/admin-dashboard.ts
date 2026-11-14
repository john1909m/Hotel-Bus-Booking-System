import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG Modules
import { UIChart } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DatePickerModule } from 'primeng/datepicker';

// Services
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import {
  AnalyticsService,
  AnalyticsDateRangeParams,
} from '../../../core/services/analytics.service';
import { extractErrorMessage } from '../../../core/utils/ErrorHandling';

// Models
import { AnalyticsSummaryDto } from '../../../core/models/Dashboard/summary.model';
import {
  AnalyticsRevenueResponseDto,
  RevenueGranularity,
} from '../../../core/models/Dashboard/revenue.model';
import {
  AnalyticsBookingsResponseDto,
  AnalyticsBookingStatusResponseDto,
  BookingsGranularity,
  BookingAnalyticsType,
  BookingStatus,
} from '../../../core/models/Dashboard/bookings.model';
import {
  AnalyticsTopHotelsResponseDto,
  AnalyticsOccupancyResponseDto,
  TopHotelsSortBy,
} from '../../../core/models/Dashboard/hotels-analytics.model';
import { AnalyticsBusTripsResponseDto } from '../../../core/models/Dashboard/bus-analytics.model';
import { AnalyticsPaymentsResponseDto } from '../../../core/models/Dashboard/payments-analytics.model';

// Chart Builders & Options
import {
  getLineChartOptions,
  getBarChartOptions,
  getDoughnutChartOptions,
  buildRevenueChartData,
  buildBookingsChartData,
  buildStatusChartData,
  buildPaymentsMethodChartData,
  buildPaymentsStatusChartData,
  buildOccupancyChartData,
  buildTopHotelsChartData,
  buildBusTripsChartData,
} from '../../../core/utils/charts';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    RouterLink,
    UIChart,
    ButtonModule,
    SkeletonModule,
    DatePickerModule,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly themeService = inject(ThemeService);
  private readonly destroy$ = new Subject<void>();

  readonly currentUser = this.authService.currentUser;
  readonly isDark = computed(() => this.themeService.theme() === 'dark');

  // ─── Date Range Controls ────────────────────────────────────
  readonly fromDate = signal<Date | null>(null);
  readonly toDate = signal<Date | null>(null);
  readonly activeFrom = signal<string | undefined>(undefined);
  readonly activeTo = signal<string | undefined>(undefined);
  readonly dateError = signal<string | null>(null);

  // ─── Card 1: Summary KPIs ───────────────────────────────────
  readonly summaryLoading = signal<boolean>(false);
  readonly summaryError = signal<string | null>(null);
  readonly summaryData = signal<AnalyticsSummaryDto | null>(null);

  // ─── Card 2: Revenue Trends ─────────────────────────────────
  readonly revenueLoading = signal<boolean>(false);
  readonly revenueError = signal<string | null>(null);
  readonly revenueData = signal<AnalyticsRevenueResponseDto | null>(null);
  readonly revenueGranularity = signal<RevenueGranularity>('DAY');

  readonly revenueChartData = computed(() =>
    buildRevenueChartData(this.revenueData()?.points ?? [], this.isDark())
  );
  readonly revenueChartOptions = computed(() =>
    getLineChartOptions(this.isDark(), true)
  );

  // ─── Card 3: Booking Volume Trends ──────────────────────────
  readonly bookingsLoading = signal<boolean>(false);
  readonly bookingsError = signal<string | null>(null);
  readonly bookingsData = signal<AnalyticsBookingsResponseDto | null>(null);
  readonly bookingsGranularity = signal<BookingsGranularity>('DAY');
  readonly bookingsType = signal<BookingAnalyticsType | undefined>(undefined);
  readonly bookingsStatus = signal<BookingStatus | undefined>(undefined);

  readonly bookingsChartData = computed(() =>
    buildBookingsChartData(this.bookingsData()?.points ?? [], this.isDark())
  );
  readonly bookingsChartOptions = computed(() =>
    getBarChartOptions(this.isDark(), false, false)
  );

  // ─── Card 4: Bookings by Status ─────────────────────────────
  readonly statusLoading = signal<boolean>(false);
  readonly statusError = signal<string | null>(null);
  readonly statusData = signal<AnalyticsBookingStatusResponseDto | null>(null);
  readonly statusType = signal<BookingAnalyticsType | undefined>(undefined);

  readonly statusChartData = computed(() =>
    buildStatusChartData(this.statusData()?.items ?? [], this.isDark())
  );
  readonly statusChartOptions = computed(() =>
    getDoughnutChartOptions(this.isDark(), false)
  );

  // ─── Card 5: Top Hotels ─────────────────────────────────────
  readonly topHotelsLoading = signal<boolean>(false);
  readonly topHotelsError = signal<string | null>(null);
  readonly topHotelsData = signal<AnalyticsTopHotelsResponseDto | null>(null);
  readonly topHotelsSortBy = signal<TopHotelsSortBy>('REVENUE');
  readonly topHotelsLimit = signal<number>(10);

  readonly topHotelsChartData = computed(() =>
    buildTopHotelsChartData(
      this.topHotelsData()?.items ?? [],
      this.topHotelsSortBy(),
      this.isDark()
    )
  );
  readonly topHotelsChartOptions = computed(() =>
    getBarChartOptions(this.isDark(), true, this.topHotelsSortBy() === 'REVENUE')
  );

  // ─── Card 6: Room Occupancy ─────────────────────────────────
  readonly occupancyLoading = signal<boolean>(false);
  readonly occupancyError = signal<string | null>(null);
  readonly occupancyData = signal<AnalyticsOccupancyResponseDto | null>(null);
  readonly occupancyHotelId = signal<number | undefined>(undefined);

  readonly occupancyChartData = computed(() =>
    buildOccupancyChartData(this.occupancyData()?.items ?? [], this.isDark())
  );
  readonly occupancyChartOptions = computed(() =>
    getBarChartOptions(this.isDark(), true, false)
  );

  // ─── Card 7: Bus Trips Utilization ──────────────────────────
  readonly busTripsLoading = signal<boolean>(false);
  readonly busTripsError = signal<string | null>(null);
  readonly busTripsData = signal<AnalyticsBusTripsResponseDto | null>(null);
  readonly busTripsRouteId = signal<number | undefined>(undefined);
  readonly busTripsLimit = signal<number>(20);

  readonly busTripsChartData = computed(() =>
    buildBusTripsChartData(this.busTripsData()?.items ?? [], this.isDark())
  );
  readonly busTripsChartOptions = computed(() =>
    getBarChartOptions(this.isDark(), false, false)
  );

  // ─── Card 8: Payments Breakdown ─────────────────────────────
  readonly paymentsLoading = signal<boolean>(false);
  readonly paymentsError = signal<string | null>(null);
  readonly paymentsData = signal<AnalyticsPaymentsResponseDto | null>(null);

  readonly paymentsMethodChartData = computed(() =>
    buildPaymentsMethodChartData(this.paymentsData()?.items ?? [], this.isDark())
  );
  readonly paymentsMethodChartOptions = computed(() =>
    getDoughnutChartOptions(this.isDark(), true)
  );

  readonly paymentsStatusChartData = computed(() =>
    buildPaymentsStatusChartData(this.paymentsData()?.items ?? [], this.isDark())
  );
  readonly paymentsStatusChartOptions = computed(() =>
    getBarChartOptions(this.isDark(), false, false)
  );

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Date Range Actions ─────────────────────────────────────

  private getActiveRangeParams(): AnalyticsDateRangeParams {
    return {
      from: this.activeFrom(),
      to: this.activeTo(),
    };
  }

  applyDateFilter(): void {
    const from = this.fromDate();
    const to = this.toDate();

    if (!from && !to) {
      this.clearDateFilter();
      return;
    }

    if (!from || !to) {
      this.dateError.set('Please select both start and end dates to filter.');
      return;
    }

    if (from.getTime() > to.getTime()) {
      this.dateError.set('Start date must be before or equal to end date.');
      return;
    }

    const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 366) {
      this.dateError.set('Date range cannot exceed 366 days.');
      return;
    }

    this.dateError.set(null);
    this.activeFrom.set(this.toIsoDate(from));
    this.activeTo.set(this.toIsoDate(to));

    this.loadAll();
  }

  clearDateFilter(): void {
    this.fromDate.set(null);
    this.toDate.set(null);
    this.activeFrom.set(undefined);
    this.activeTo.set(undefined);
    this.dateError.set(null);
    this.loadAll();
  }

  setPreset(days: number): void {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - (days - 1));

    this.fromDate.set(past);
    this.toDate.set(now);
    this.dateError.set(null);
    this.activeFrom.set(this.toIsoDate(past));
    this.activeTo.set(this.toIsoDate(now));

    this.loadAll();
  }

  private toIsoDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ─── Card Loaders (Parallel & Independent) ──────────────────

  loadAll(): void {
    this.loadSummary();
    this.loadRevenue();
    this.loadBookingsTrends();
    this.loadBookingsByStatus();
    this.loadTopHotels();
    this.loadOccupancy();
    this.loadBusTrips();
    this.loadPayments();
  }

  loadSummary(): void {
    this.summaryLoading.set(true);
    this.summaryError.set(null);

    this.analyticsService
      .getSummary(this.getActiveRangeParams())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.summaryData.set(data);
          this.summaryLoading.set(false);
        },
        error: (err) => {
          this.summaryLoading.set(false);
          this.summaryError.set(extractErrorMessage(err, 'Failed to load summary KPIs.'));
        },
      });
  }

  loadRevenue(): void {
    this.revenueLoading.set(true);
    this.revenueError.set(null);

    this.analyticsService
      .getRevenueTrends({
        ...this.getActiveRangeParams(),
        granularity: this.revenueGranularity(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.revenueData.set(data);
          this.revenueLoading.set(false);
        },
        error: (err) => {
          this.revenueLoading.set(false);
          this.revenueError.set(extractErrorMessage(err, 'Failed to load revenue trends.'));
        },
      });
  }

  setRevenueGranularity(g: RevenueGranularity): void {
    if (this.revenueGranularity() === g) return;
    this.revenueGranularity.set(g);
    this.loadRevenue();
  }

  loadBookingsTrends(): void {
    this.bookingsLoading.set(true);
    this.bookingsError.set(null);

    this.analyticsService
      .getBookingsTrends({
        ...this.getActiveRangeParams(),
        granularity: this.bookingsGranularity(),
        type: this.bookingsType(),
        status: this.bookingsStatus(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.bookingsData.set(data);
          this.bookingsLoading.set(false);
        },
        error: (err) => {
          this.bookingsLoading.set(false);
          this.bookingsError.set(extractErrorMessage(err, 'Failed to load bookings trends.'));
        },
      });
  }

  setBookingsGranularity(g: BookingsGranularity): void {
    if (this.bookingsGranularity() === g) return;
    this.bookingsGranularity.set(g);
    this.loadBookingsTrends();
  }

  setBookingsType(type: BookingAnalyticsType | undefined): void {
    this.bookingsType.set(type);
    this.loadBookingsTrends();
  }

  setBookingsStatus(status: BookingStatus | undefined): void {
    this.bookingsStatus.set(status);
    this.loadBookingsTrends();
  }

  loadBookingsByStatus(): void {
    this.statusLoading.set(true);
    this.statusError.set(null);

    this.analyticsService
      .getBookingsByStatus({
        ...this.getActiveRangeParams(),
        type: this.statusType(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.statusData.set(data);
          this.statusLoading.set(false);
        },
        error: (err) => {
          this.statusLoading.set(false);
          this.statusError.set(extractErrorMessage(err, 'Failed to load bookings by status.'));
        },
      });
  }

  setStatusType(type: BookingAnalyticsType | undefined): void {
    this.statusType.set(type);
    this.loadBookingsByStatus();
  }

  loadTopHotels(): void {
    this.topHotelsLoading.set(true);
    this.topHotelsError.set(null);

    this.analyticsService
      .getTopHotels({
        ...this.getActiveRangeParams(),
        limit: this.topHotelsLimit(),
        sortBy: this.topHotelsSortBy(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.topHotelsData.set(data);
          this.topHotelsLoading.set(false);
        },
        error: (err) => {
          this.topHotelsLoading.set(false);
          this.topHotelsError.set(extractErrorMessage(err, 'Failed to load top hotels.'));
        },
      });
  }

  setTopHotelsSortBy(sortBy: TopHotelsSortBy): void {
    this.topHotelsSortBy.set(sortBy);
    this.loadTopHotels();
  }

  setTopHotelsLimit(limit: number): void {
    this.topHotelsLimit.set(limit);
    this.loadTopHotels();
  }

  loadOccupancy(): void {
    this.occupancyLoading.set(true);
    this.occupancyError.set(null);

    this.analyticsService
      .getOccupancy({
        ...this.getActiveRangeParams(),
        hotelId: this.occupancyHotelId(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.occupancyData.set(data);
          this.occupancyLoading.set(false);
        },
        error: (err) => {
          this.occupancyLoading.set(false);
          this.occupancyError.set(extractErrorMessage(err, 'Failed to load occupancy data.'));
        },
      });
  }

  setOccupancyHotelId(val: string): void {
    const parsed = val.trim() ? Number(val.trim()) : undefined;
    this.occupancyHotelId.set(isNaN(parsed as any) ? undefined : parsed);
    this.loadOccupancy();
  }

  loadBusTrips(): void {
    this.busTripsLoading.set(true);
    this.busTripsError.set(null);

    this.analyticsService
      .getBusTrips({
        ...this.getActiveRangeParams(),
        limit: this.busTripsLimit(),
        routeId: this.busTripsRouteId(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.busTripsData.set(data);
          this.busTripsLoading.set(false);
        },
        error: (err) => {
          this.busTripsLoading.set(false);
          this.busTripsError.set(extractErrorMessage(err, 'Failed to load bus trips utilization.'));
        },
      });
  }

  setBusTripsLimit(limit: number): void {
    this.busTripsLimit.set(limit);
    this.loadBusTrips();
  }

  setBusTripsRouteId(val: string): void {
    const parsed = val.trim() ? Number(val.trim()) : undefined;
    this.busTripsRouteId.set(isNaN(parsed as any) ? undefined : parsed);
    this.loadBusTrips();
  }

  loadPayments(): void {
    this.paymentsLoading.set(true);
    this.paymentsError.set(null);

    this.analyticsService
      .getPayments(this.getActiveRangeParams())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.paymentsData.set(data);
          this.paymentsLoading.set(false);
        },
        error: (err) => {
          this.paymentsLoading.set(false);
          this.paymentsError.set(extractErrorMessage(err, 'Failed to load payments breakdown.'));
        },
      });
  }
}
