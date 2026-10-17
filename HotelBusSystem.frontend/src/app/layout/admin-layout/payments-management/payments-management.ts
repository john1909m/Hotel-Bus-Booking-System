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
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

// Core Models & Services
import { PaymentService } from '../../../core/services/payment.service';
import { PaymentDTO, paymentMethod, paymentStatus } from '../../../core/models/Payment/payment.model';

@Component({
  selector: 'app-payments-management',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, TableModule, ButtonModule, ToastModule, TagModule],
  providers: [MessageService],
  templateUrl: './payments-management.html',
  styleUrl: './payments-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsManagement implements OnInit, OnDestroy {
  private readonly paymentService = inject(PaymentService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  readonly payments = signal<PaymentDTO[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchQuery = signal<string>('');
  readonly methodFilter = signal<string>('');
  readonly statusFilter = signal<string>('');

  readonly filteredPayments = computed(() => {
    let list = this.payments();
    const q = this.searchQuery().trim().toLowerCase();
    const m = this.methodFilter();
    const s = this.statusFilter();

    if (m) {
      list = list.filter((p) => p.paymentMethod === m);
    }
    if (s) {
      list = list.filter((p) => p.paymentStatus === s);
    }
    if (q) {
      list = list.filter(
        (p) =>
          String(p.id).includes(q) ||
          (p.hotelBookingId && String(p.hotelBookingId).includes(q)) ||
          (p.busBookingId && String(p.busBookingId).includes(q))
      );
    }
    return list;
  });

  readonly totalCompletedRevenue = computed(() => {
    return this.filteredPayments()
      .filter((p) => p.paymentStatus === 'COMPLETED')
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  });

  readonly hasActiveFilters = computed(
    () => !!(this.searchQuery() || this.methodFilter() || this.statusFilter())
  );

  ngOnInit(): void {
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
      });

    this.loadPayments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPayments(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.paymentService
      .getPayments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.payments.set(Array.isArray(data) ? data : []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load payments from backend.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Payments',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  onSearchInput(val: string): void {
    this.searchSubject$.next(val);
  }

  onMethodChange(val: string): void {
    this.methodFilter.set(val);
  }

  onStatusChange(val: string): void {
    this.statusFilter.set(val);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.methodFilter.set('');
    this.statusFilter.set('');
  }

  formatMethod(m: paymentMethod | string): string {
    switch (m) {
      case 'CREDIT_CARD':
        return '💳 Credit Card';
      case 'DEBIT_CARD':
        return '💳 Debit Card';
      case 'PAYPAL':
        return '🅿️ PayPal';
      case 'BANK_TRANSFER':
        return '🏦 Bank Transfer';
      default:
        return m;
    }
  }

  getStatusSeverity(s: paymentStatus | string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    switch (s) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warn';
      case 'PROCESSING':
        return 'info';
      case 'FAILED':
        return 'danger';
      case 'REFUNDED':
        return 'secondary';
      default:
        return 'secondary';
    }
  }
}
