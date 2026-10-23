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
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

// Core Models & Services
import { PaymentService } from '../../../core/services/payment.service';
import {
  PaymentDTO,
  PaymentRequestDTO,
  paymentMethod,
  paymentStatus,
} from '../../../core/models/Payment/payment.model';

@Component({
  selector: 'app-payments-management',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    ToastModule,
    TagModule,
  ],
  providers: [MessageService],
  templateUrl: './payments-management.html',
  styleUrl: './payments-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsManagement implements OnInit, OnDestroy {
  private readonly paymentService = inject(PaymentService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  readonly payments = signal<PaymentDTO[]>([]);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchQuery = signal<string>('');
  readonly methodFilter = signal<string>('');
  readonly statusFilter = signal<string>('');

  // ── Dialog Signals ─────────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingPaymentId = signal<number | null>(null);

  readonly deleteDialogVisible = signal<boolean>(false);
  readonly paymentToDelete = signal<PaymentDTO | null>(null);

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

  // ── Reactive Form ──────────────────────────────────────────
  readonly paymentForm: FormGroup = this.fb.group({
    amount: [100, [Validators.required, Validators.min(0.01)]],
    paymentMethod: ['CREDIT_CARD', [Validators.required]],
    paymentStatus: ['COMPLETED', [Validators.required]],
    transactionDate: ['', [Validators.required]],
    bookingType: ['HOTEL', [Validators.required]],
    bookingId: [1, [Validators.required, Validators.min(1)]],
  });

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

  // ── Create & Edit Handlers ─────────────────────────────────
  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.editingPaymentId.set(null);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 16);

    this.paymentForm.reset({
      amount: 100,
      paymentMethod: 'CREDIT_CARD',
      paymentStatus: 'COMPLETED',
      transactionDate: dateStr,
      bookingType: 'HOTEL',
      bookingId: 1,
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(p: PaymentDTO): void {
    this.isEditMode.set(true);
    this.editingPaymentId.set(p.id);

    const dateStr = p.transactionDate ? p.transactionDate.slice(0, 16) : '';
    const isHotel = !!p.hotelBookingId;
    const bType = isHotel ? 'HOTEL' : 'BUS';
    const bId = isHotel ? p.hotelBookingId : (p.busBookingId || 1);

    this.paymentForm.patchValue({
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      paymentStatus: p.paymentStatus,
      transactionDate: dateStr,
      bookingType: bType,
      bookingId: bId,
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.paymentForm.reset();
  }

  savePayment(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please check the required payment fields.',
        life: 4000,
      });
      return;
    }

    this.saving.set(true);
    const formVal = this.paymentForm.getRawValue();

    const isHotel = formVal.bookingType === 'HOTEL';
    const payload: PaymentRequestDTO = {
      amount: Number(formVal.amount),
      paymentMethod: formVal.paymentMethod as paymentMethod,
      paymentStatus: formVal.paymentStatus as paymentStatus,
      transactionDate: String(formVal.transactionDate),
      hotelBookingId: isHotel ? Number(formVal.bookingId) : 0,
      busBookingId: !isHotel ? Number(formVal.bookingId) : 0,
    };

    if (this.isEditMode()) {
      const id = this.editingPaymentId();
      if (!id) {
        this.saving.set(false);
        return;
      }

      this.paymentService
        .updatePayment(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Payment Updated',
              detail: `Payment #${id} has been successfully updated.`,
              life: 4000,
            });
            this.loadPayments();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to update payment.';
            this.messageService.add({
              severity: 'error',
              summary: 'Update Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    } else {
      this.paymentService
        .createPayment(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Payment Recorded',
              detail: `Payment #${created.id} was recorded successfully.`,
              life: 4000,
            });
            this.loadPayments();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to create payment.';
            this.messageService.add({
              severity: 'error',
              summary: 'Creation Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    }
  }

  // ── Delete Handlers ────────────────────────────────────────
  openDeleteDialog(payment: PaymentDTO): void {
    this.paymentToDelete.set(payment);
    this.deleteDialogVisible.set(true);
  }

  closeDeleteDialog(): void {
    this.deleteDialogVisible.set(false);
    this.paymentToDelete.set(null);
  }

  confirmDeletePayment(): void {
    const payment = this.paymentToDelete();
    if (!payment) return;

    this.deleting.set(true);
    this.paymentService
      .deletePayment(payment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.paymentToDelete.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Payment Deleted',
            detail: `Payment #${payment.id} has been deleted.`,
            life: 4000,
          });
          this.loadPayments();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = err?.message || 'Failed to delete payment.';
          this.messageService.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail: msg,
            life: 5000,
          });
        },
      });
  }
}
