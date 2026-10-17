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
import { BusTripService, BusTripListParams } from '../../../core/services/bus-trip.service';
import { BusService } from '../../../core/services/bus.service';
import { BusRouteService } from '../../../core/services/bus-route.service';
import { BusTripDTO, status } from '../../../core/models/Bus/bus-trip.model';
import { BusDTO } from '../../../core/models/Bus/bus.model';
import { BusRouteDTO } from '../../../core/models/Bus/bus-route';
import { PageBusTripDTO } from '../../../core/models/Pagination/busTripPage.model';

@Component({
  selector: 'app-bus-trips-management',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, TableModule, ButtonModule, ToastModule, TagModule],
  providers: [MessageService],
  templateUrl: './bus-trips-management.html',
  styleUrl: './bus-trips-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusTripsManagement implements OnInit, OnDestroy {
  private readonly busTripService = inject(BusTripService);
  private readonly busService = inject(BusService);
  private readonly busRouteService = inject(BusRouteService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  readonly trips = signal<BusTripDTO[]>([]);
  readonly buses = signal<BusDTO[]>([]);
  readonly routes = signal<BusRouteDTO[]>([]);
  readonly pageData = signal<PageBusTripDTO | null>(null);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly statusFilter = signal<string>('');
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

  readonly totalElements = computed(() => this.pageData()?.totalElements ?? 0);
  readonly firstRow = computed(() => this.currentPage() * this.pageSize());

  ngOnInit(): void {
    this.loadLookups();
    this.loadTrips();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLookups(): void {
    this.busService
      .lookupBuses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => this.buses.set(Array.isArray(list) ? list : []),
        error: () => this.buses.set([]),
      });

    this.busRouteService
      .lookupBusRoutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => this.routes.set(Array.isArray(list) ? list : []),
        error: () => this.routes.set([]),
      });
  }

  loadTrips(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: BusTripListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
    };

    const s = this.statusFilter();
    if (s) params.status = s as status;

    this.busTripService
      .getAllBusTrips(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.trips.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load bus trips from backend.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Trips',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  onStatusChange(val: string): void {
    this.statusFilter.set(val);
    this.currentPage.set(0);
    this.loadTrips();
  }

  clearFilters(): void {
    this.statusFilter.set('');
    this.currentPage.set(0);
    this.loadTrips();
  }

  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.currentPage.set(pageIndex);
    this.loadTrips();
  }

  getBusLabel(busId: number): string {
    const found = this.buses().find((b) => b.id === busId);
    return found ? `${found.busNumber} (${found.company})` : `Bus #${busId}`;
  }

  getRouteLabel(routeId: number): string {
    const found = this.routes().find((r) => r.id === routeId);
    return found ? found.name : `Route #${routeId}`;
  }

  getStatusSeverity(s: status | string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (s) {
      case 'SCHEDULED':
        return 'info';
      case 'DEPARTED':
        return 'warn';
      case 'ARRIVED':
        return 'success';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}
