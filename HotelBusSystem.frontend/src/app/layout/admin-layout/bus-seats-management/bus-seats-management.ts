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
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

// Core Models & Services
import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusService } from '../../../core/services/bus.service';
import { BusSeatDTO, seatType } from '../../../core/models/Bus/bus-seat.model';
import { BusDTO } from '../../../core/models/Bus/bus.model';

@Component({
  selector: 'app-bus-seats-management',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, ToastModule, TagModule],
  providers: [MessageService],
  templateUrl: './bus-seats-management.html',
  styleUrl: './bus-seats-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusSeatsManagement implements OnInit, OnDestroy {
  private readonly busSeatService = inject(BusSeatService);
  private readonly busService = inject(BusService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  readonly seats = signal<BusSeatDTO[]>([]);
  readonly buses = signal<BusDTO[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchQuery = signal<string>('');
  readonly selectedBusId = signal<number | null>(null);
  readonly seatTypeFilter = signal<string>('');

  readonly filteredSeats = computed(() => {
    let list = this.seats();
    const q = this.searchQuery().trim().toLowerCase();
    const busId = this.selectedBusId();
    const sType = this.seatTypeFilter();

    if (busId !== null) {
      list = list.filter((s) => s.busId === busId);
    }
    if (sType) {
      list = list.filter((s) => s.seatType === sType);
    }
    if (q) {
      list = list.filter((s) => s.seatNumber.toLowerCase().includes(q));
    }
    return list;
  });

  readonly hasActiveFilters = computed(
    () =>
      !!(
        this.searchQuery() ||
        this.selectedBusId() !== null ||
        this.seatTypeFilter()
      )
  );

  ngOnInit(): void {
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
      });

    this.loadBusesLookup();
    this.loadSeats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBusesLookup(): void {
    this.busService
      .lookupBuses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.buses.set(Array.isArray(list) ? list : []);
        },
        error: () => {
          this.buses.set([]);
        },
      });
  }

  loadSeats(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const busId = this.selectedBusId();
    const request$ =
      busId !== null
        ? this.busSeatService.getBusSeatsByBusId(busId)
        : this.busSeatService.getAllBusSeats();

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.seats.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.message || 'Failed to load bus seats from backend.';
        this.errorMessage.set(msg);
        this.messageService.add({
          severity: 'error',
          summary: 'Error Loading Seats',
          detail: msg,
          life: 5000,
        });
      },
    });
  }

  onSearchInput(val: string): void {
    this.searchSubject$.next(val);
  }

  onBusChange(val: string): void {
    const id = val ? parseInt(val, 10) : null;
    this.selectedBusId.set(isNaN(id as any) ? null : id);
    this.loadSeats();
  }

  onTypeChange(val: string): void {
    this.seatTypeFilter.set(val);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedBusId.set(null);
    this.seatTypeFilter.set('');
    this.loadSeats();
  }

  getBusLabel(busId: number): string {
    const found = this.buses().find((b) => b.id === busId);
    return found ? `${found.busNumber} (${found.company})` : `Bus #${busId}`;
  }

  getSeatTypeSeverity(type: seatType | string): 'info' | 'warn' | 'success' | 'secondary' {
    switch (type) {
      case 'REGULAR':
        return 'secondary';
      case 'PREMIUM':
        return 'warn';
      case 'WINDOW':
        return 'info';
      case 'AISLE':
        return 'success';
      default:
        return 'info';
    }
  }
}
