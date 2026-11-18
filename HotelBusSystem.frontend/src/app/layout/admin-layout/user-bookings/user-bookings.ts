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
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

// Core Models & Services
import { UserService } from '../../../core/services/user.service';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { PaymentService } from '../../../core/services/payment.service';
import { UserDto } from '../../../core/models/User/user.model';
import { HotelBookingDTO, status as BookingStatusType } from '../../../core/models/Hotel/hotel-booking.model';
import { BusBookingDTO } from '../../../core/models/Bus/bus-booking.model';
import { PaymentDTO } from '../../../core/models/Payment/payment.model';

export interface DisplayBookingItem {
  id: number;
  type: 'HOTEL' | 'BUS';
  status: string;
  details: string;
  totalGuests: number;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
}

@Component({
  selector: 'app-user-bookings',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    SelectModule,
    ToastModule,
    TranslatePipe,
  ],
  providers: [MessageService],
  templateUrl: './user-bookings.html',
  styleUrl: './user-bookings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserBookings implements OnInit, OnDestroy {
  private readonly userService = inject(UserService);
  private readonly hotelBookingService = inject(HotelBookingService);
  private readonly busBookingService = inject(BusBookingService);
  private readonly paymentService = inject(PaymentService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService, { optional: true });
  private readonly destroy$ = new Subject<void>();

  // ── User Selection ─────────────────────────────────────────
  readonly users = signal<UserDto[]>([]);
  readonly loadingUsers = signal<boolean>(false);
  readonly selectedUserId = signal<number | null>(null);

  // ── Bookings & Loading States ──────────────────────────────
  readonly hotelBookings = signal<HotelBookingDTO[]>([]);
  readonly busBookings = signal<BusBookingDTO[]>([]);
  readonly loadingHotel = signal<boolean>(false);
  readonly loadingBus = signal<boolean>(false);
  readonly errorHotel = signal<string | null>(null);
  readonly errorBus = signal<string | null>(null);

  // ── Payments Maps ──────────────────────────────────────────
  readonly hotelPayments = signal<Record<number, PaymentDTO[]>>({});
  readonly busPayments = signal<Record<number, PaymentDTO[]>>({});

  // ── Filters ────────────────────────────────────────────────
  readonly statusFilter = signal<string>('ALL');
  readonly paymentMethodFilter = signal<string>('ALL');
  readonly typeFilter = signal<'ALL' | 'HOTEL' | 'BUS'>('ALL');

  readonly availableStatuses = ['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
  readonly availablePaymentMethods = [
    'ALL',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'PAYPAL',
    'BANK_TRANSFER',
    'No payment',
  ];
  readonly availableTypes = [
    { labelKey: 'admin.userBookings.allBookings', value: 'ALL' },
    { labelKey: 'admin.userBookings.hotelBookingsSection', value: 'HOTEL' },
    { labelKey: 'admin.userBookings.busBookingsSection', value: 'BUS' },
  ];

  // ── Computed Options & Filtered Lists ──────────────────────
  readonly userOptions = computed(() => {
    return this.users().map((u) => ({
      label: `${u.name} (${u.email})`,
      value: u.id,
      name: u.name,
      email: u.email,
    }));
  });

  readonly selectedUser = computed(() => {
    const id = this.selectedUserId();
    if (!id) return null;
    return this.users().find((u) => u.id === id) || null;
  });

  // Filtered Hotel Bookings
  readonly displayedHotelBookings = computed<DisplayBookingItem[]>(() => {
    const rawList = this.hotelBookings();
    const payMap = this.hotelPayments();
    const stFilter = this.statusFilter();
    const payFilter = this.paymentMethodFilter();

    return rawList
      .map((b): DisplayBookingItem => {
        const payments = payMap[b.id] || [];
        const firstPayment = payments.length > 0 ? payments[0] : null;
        const method = firstPayment?.paymentMethod ? String(firstPayment.paymentMethod) : 'No payment';
        const pStatus = firstPayment?.paymentStatus ? String(firstPayment.paymentStatus) : 'UNPAID';

        const hotelTitle = b.hotelName ? b.hotelName : `Hotel #${b.hotelId}`;
        const datesStr = `${b.checkIn} → ${b.checkOut}`;

        return {
          id: b.id,
          type: 'HOTEL',
          status: b.status,
          details: `${hotelTitle} (${datesStr})`,
          totalGuests: b.guests, // Server total only (no split)
          totalPrice: b.totalPrice,
          paymentMethod: method,
          paymentStatus: pStatus,
        };
      })
      .filter((item) => {
        if (stFilter !== 'ALL' && item.status !== stFilter) return false;
        if (payFilter !== 'ALL' && item.paymentMethod !== payFilter) return false;
        return true;
      });
  });

  // Filtered Bus Bookings
  readonly displayedBusBookings = computed<DisplayBookingItem[]>(() => {
    const rawList = this.busBookings();
    const payMap = this.busPayments();
    const stFilter = this.statusFilter();
    const payFilter = this.paymentMethodFilter();

    return rawList
      .map((b): DisplayBookingItem => {
        const payments = payMap[b.id] || [];
        const firstPayment = payments.length > 0 ? payments[0] : null;
        const method = firstPayment?.paymentMethod ? String(firstPayment.paymentMethod) : 'No payment';
        const pStatus = firstPayment?.paymentStatus ? String(firstPayment.paymentStatus) : 'UNPAID';

        const seatStr = b.seatId ? `Seat #${b.seatId}` : 'Seat';
        const tripStr = b.busTripId ? `Trip #${b.busTripId}` : 'Bus Trip';

        return {
          id: b.id,
          type: 'BUS',
          status: b.status,
          details: `${tripStr} • ${seatStr}`,
          totalGuests: 1, // Single passenger booking
          totalPrice: b.price,
          paymentMethod: method,
          paymentStatus: pStatus,
        };
      })
      .filter((item) => {
        if (stFilter !== 'ALL' && item.status !== stFilter) return false;
        if (payFilter !== 'ALL' && item.paymentMethod !== payFilter) return false;
        return true;
      });
  });

  readonly totalLoadedCount = computed(() => {
    return this.displayedHotelBookings().length + this.displayedBusBookings().length;
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    this.loadingUsers.set(true);
    this.userService
      .getAllUsers({ page: 0, size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.users.set(page.content || []);
          this.loadingUsers.set(false);
        },
        error: (err) => {
          this.users.set([]);
          this.loadingUsers.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Users',
            detail: err?.message || 'Failed to load user list.',
            life: 5000,
          });
        },
      });
  }

  onUserChange(val: number | null): void {
    const userId = val ? Number(val) : null;
    this.selectedUserId.set(userId);

    if (!userId) {
      this.hotelBookings.set([]);
      this.busBookings.set([]);
      this.errorHotel.set(null);
      this.errorBus.set(null);
      return;
    }

    this.loadUserBookings(userId);
  }

  loadUserBookings(userId: number): void {
    this.loadHotelBookings(userId);
    this.loadBusBookings(userId);
  }

  loadHotelBookings(userId?: number): void {
    const id = userId ?? this.selectedUserId();
    if (!id) return;

    this.loadingHotel.set(true);
    this.errorHotel.set(null);

    this.hotelBookingService
      .getAllHotelBookings({ userId: id, size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          const list = page.content || [];
          this.hotelBookings.set(list);
          this.loadingHotel.set(false);
          this.fetchHotelPayments(list);
        },
        error: (err) => {
          this.loadingHotel.set(false);
          const msg = err?.message || 'Failed to load user hotel bookings.';
          this.errorHotel.set(msg);
        },
      });
  }

  loadBusBookings(userId?: number): void {
    const id = userId ?? this.selectedUserId();
    if (!id) return;

    this.loadingBus.set(true);
    this.errorBus.set(null);

    this.busBookingService
      .getAllBusBookings({ userId: id, size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          const list = page.content || [];
          this.busBookings.set(list);
          this.loadingBus.set(false);
          this.fetchBusPayments(list);
        },
        error: (err) => {
          this.loadingBus.set(false);
          const msg = err?.message || 'Failed to load user bus bookings.';
          this.errorBus.set(msg);
        },
      });
  }

  private fetchHotelPayments(bookings: HotelBookingDTO[]): void {
    for (const b of bookings) {
      this.paymentService
        .getPaymentsByHotelBookingId(b.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (payments) => {
            const list = Array.isArray(payments) ? payments : [];
            this.hotelPayments.update((curr) => ({ ...curr, [b.id]: list }));
          },
          error: () => {
            this.hotelPayments.update((curr) => ({ ...curr, [b.id]: [] }));
          },
        });
    }
  }

  private fetchBusPayments(bookings: BusBookingDTO[]): void {
    for (const b of bookings) {
      this.paymentService
        .getPaymentsByBusBookingId(b.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (payments) => {
            const list = Array.isArray(payments) ? payments : [];
            this.busPayments.update((curr) => ({ ...curr, [b.id]: list }));
          },
          error: () => {
            this.busPayments.update((curr) => ({ ...curr, [b.id]: [] }));
          },
        });
    }
  }

  onStatusChange(val: string): void {
    this.statusFilter.set(val);
  }

  onPaymentMethodChange(val: string): void {
    this.paymentMethodFilter.set(val);
  }

  onTypeChange(val: 'ALL' | 'HOTEL' | 'BUS'): void {
    this.typeFilter.set(val);
  }

  getStatusSeverity(s: string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
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

  getPaymentSeverity(method: string): 'info' | 'success' | 'warn' | 'secondary' {
    switch (method) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return 'success';
      case 'PAYPAL':
        return 'info';
      case 'BANK_TRANSFER':
        return 'warn';
      default:
        return 'secondary';
    }
  }
}
