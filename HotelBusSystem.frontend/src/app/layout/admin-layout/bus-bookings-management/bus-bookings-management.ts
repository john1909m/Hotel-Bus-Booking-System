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
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

// Core Models & Services
import { BusBookingService, BusBookingListParams } from '../../../core/services/bus-booking.service';
import { BusBookingDTO, Status } from '../../../core/models/Bus/bus-booking.model';
import { PageBusBookingDTO } from '../../../core/models/Pagination/busBookingPage.model';

@Component({
  selector: 'app-bus-bookings-management',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, TableModule, ButtonModule, ToastModule, TagModule],
  providers: [MessageService],
  templateUrl: './bus-bookings-management.html',
  styleUrl: './bus-bookings-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusBookingsManagement implements OnInit, OnDestroy {
  private readonly bookingService = inject(BusBookingService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  readonly bookings = signal<BusBookingDTO[]>([]);
  readonly pageData = signal<PageBusBookingDTO | null>(null);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchFilter = signal<string>('');
  readonly sortDirection = signal<string>('desc');
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

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
        String(b.userId).includes(q)
    );
  });

  ngOnInit(): void {
    this.loadBookings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
}
