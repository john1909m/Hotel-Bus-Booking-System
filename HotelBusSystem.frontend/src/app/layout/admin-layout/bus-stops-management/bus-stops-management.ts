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
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Core Models & Services
import { BusStopService, BusStopListParams } from '../../../core/services/bus-stop.service';
import { BusStopDto } from '../../../core/models/Bus/bus-stop.model';
import { PageBusStopDTO } from '../../../core/models/Pagination/busStopPage.model';

@Component({
  selector: 'app-bus-stops-management',
  standalone: true,
  imports: [CommonModule, DecimalPipe, TableModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './bus-stops-management.html',
  styleUrl: './bus-stops-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusStopsManagement implements OnInit, OnDestroy {
  private readonly busStopService = inject(BusStopService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  readonly busStops = signal<BusStopDto[]>([]);
  readonly pageData = signal<PageBusStopDTO | null>(null);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchQuery = signal<string>('');
  readonly cityFilter = signal<string>('');
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

  readonly totalElements = computed(() => this.pageData()?.totalElements ?? 0);
  readonly firstRow = computed(() => this.currentPage() * this.pageSize());
  readonly hasActiveFilters = computed(
    () => !!(this.searchQuery() || this.cityFilter())
  );

  ngOnInit(): void {
    this.searchSubject$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(0);
        this.loadBusStops();
      });

    this.loadBusStops();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBusStops(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: BusStopListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
    };

    const q = this.searchQuery().trim();
    if (q) params.q = q;

    const city = this.cityFilter().trim();
    if (city) params.city = city;

    this.busStopService
      .getAllBusStops(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.busStops.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load bus stops from backend.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Stops',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject$.next(value);
  }

  onCityChange(value: string): void {
    this.cityFilter.set(value);
    this.currentPage.set(0);
    this.loadBusStops();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.cityFilter.set('');
    this.currentPage.set(0);
    this.loadBusStops();
  }

  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.currentPage.set(pageIndex);
    this.loadBusStops();
  }
}
