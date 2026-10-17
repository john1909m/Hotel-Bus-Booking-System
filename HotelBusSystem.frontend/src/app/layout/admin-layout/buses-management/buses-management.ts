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
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

// Core Models & Services
import { BusService, BusListParams } from '../../../core/services/bus.service';
import { BusDTO } from '../../../core/models/Bus/bus.model';
import { PageBusDTO } from '../../../core/models/Pagination/busPage.model';

@Component({
  selector: 'app-buses-management',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, ToastModule, TagModule],
  providers: [MessageService],
  templateUrl: './buses-management.html',
  styleUrl: './buses-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusesManagement implements OnInit, OnDestroy {
  private readonly busService = inject(BusService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  readonly buses = signal<BusDTO[]>([]);
  readonly pageData = signal<PageBusDTO | null>(null);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchFilter = signal<string>('');
  readonly sortBy = signal<string>('id');
  readonly sortDirection = signal<string>('asc');
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

  readonly totalElements = computed(() => this.pageData()?.totalElements ?? 0);
  readonly firstRow = computed(() => this.currentPage() * this.pageSize());

  readonly displayedBuses = computed(() => {
    const q = this.searchFilter().trim().toLowerCase();
    const list = this.buses();
    if (!q) return list;
    return list.filter(
      (b) =>
        b.busNumber.toLowerCase().includes(q) ||
        (b.company && b.company.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    this.loadBuses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBuses(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: BusListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: this.sortBy(),
      sortDirection: this.sortDirection(),
    };

    this.busService
      .getAllBuses(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.buses.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load buses from backend.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Buses',
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
    this.loadBuses();
  }

  onDirChange(val: string): void {
    this.sortDirection.set(val);
    this.currentPage.set(0);
    this.loadBuses();
  }

  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.currentPage.set(pageIndex);
    this.loadBuses();
  }
}
