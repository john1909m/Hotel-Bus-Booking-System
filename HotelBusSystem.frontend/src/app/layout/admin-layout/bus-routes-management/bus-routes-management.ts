import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Core Models & Services
import { BusRouteService, BusRouteListParams } from '../../../core/services/bus-route.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusRouteDTO } from '../../../core/models/Bus/bus-route';
import { BusStopDto } from '../../../core/models/Bus/bus-stop.model';
import { PageBusRouteDTO } from '../../../core/models/Pagination/busRoutePage.model';

@Component({
  selector: 'app-bus-routes-management',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './bus-routes-management.html',
  styleUrl: './bus-routes-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusRoutesManagement implements OnInit, OnDestroy {
  private readonly busRouteService = inject(BusRouteService);
  private readonly busStopService = inject(BusStopService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  readonly routes = signal<BusRouteDTO[]>([]);
  readonly stops = signal<BusStopDto[]>([]);
  readonly pageData = signal<PageBusRouteDTO | null>(null);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchFilter = signal<string>('');
  readonly sortBy = signal<string>('id');
  readonly sortDirection = signal<string>('asc');
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

  readonly totalElements = computed(() => this.pageData()?.totalElements ?? 0);
  readonly firstRow = computed(() => this.currentPage() * this.pageSize());

  readonly displayedRoutes = computed(() => {
    const q = this.searchFilter().trim().toLowerCase();
    const list = this.routes();
    if (!q) return list;
    return list.filter((r) => r.name.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.loadStopsLookup();
    this.loadBusRoutes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStopsLookup(): void {
    this.busStopService
      .lookupBusStops({ size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.stops.set(Array.isArray(data) ? data : []);
        },
        error: () => {
          this.stops.set([]);
        },
      });
  }

  loadBusRoutes(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: BusRouteListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: this.sortBy(),
      sortDirection: this.sortDirection(),
    };

    this.busRouteService
      .getAllBusRoutes(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.routes.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load bus routes from backend.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Routes',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  onSearchFilter(val: string): void {
    this.searchFilter.set(val);
  }

  onSortChange(val: string): void {
    this.sortBy.set(val);
    this.currentPage.set(0);
    this.loadBusRoutes();
  }

  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.currentPage.set(pageIndex);
    this.loadBusRoutes();
  }

  getStopName(stopId: number): string {
    const found = this.stops().find((s) => s.id === stopId);
    return found ? `${found.name} (${found.city})` : `Stop #${stopId}`;
  }

  formatDuration(minutes: number): string {
    if (!minutes && minutes !== 0) return '—';
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  }
}
