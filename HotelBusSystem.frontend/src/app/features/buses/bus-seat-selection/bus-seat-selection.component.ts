import {
  Component,
  ChangeDetectionStrategy,
  inject,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, of, catchError } from 'rxjs';

import { Dialog } from 'primeng/dialog';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { AuthService } from '../../../core/services/auth.service';

import { BusSeatDTO } from '../../../core/models/Bus/bus-seat.model';
import { BusBookingDTO, BusBookingRequestDTO } from '../../../core/models/Bus/bus-booking.model';
import { EnrichedBusTrip } from '../bus-search-results/bus-search-results';
import { extractErrorMessage } from '../../../../utils/ErrorHandling';

export interface SeatRow {
  rowNumber: number;
  leftSeats: (BusSeatDTO | null)[];
  rightSeats: (BusSeatDTO | null)[];
}

@Component({
  selector: 'app-bus-seat-selection',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    RouterLink,
    Dialog,
    Tag,
    Tooltip,
  ],
  templateUrl: './bus-seat-selection.component.html',
  styleUrl: './bus-seat-selection.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusSeatSelectionComponent implements OnChanges, OnDestroy {
  private readonly busSeatService = inject(BusSeatService);
  private readonly busBookingService = inject(BusBookingService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  @Input({ required: true }) trip: EnrichedBusTrip | null = null;
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() bookingComplete = new EventEmitter<BusBookingDTO[]>();

  // State Signals
  readonly loading = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly allSeats = signal<BusSeatDTO[]>([]);
  readonly bookedSeatIds = signal<Set<number>>(new Set());
  readonly selectedSeatIds = signal<Set<number>>(new Set());
  readonly seatRows = signal<SeatRow[]>([]);

  // Payment placeholder / completion state
  readonly showPaymentPlaceholder = signal<boolean>(false);
  readonly createdBookings = signal<BusBookingDTO[]>([]);

  // Computed signals
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  readonly selectedSeatsList = computed(() => {
    const ids = this.selectedSeatIds();
    const map = new Map<number, BusSeatDTO>();
    this.allSeats().forEach((s) => map.set(s.id, s));
    return Array.from(ids)
      .map((id) => map.get(id))
      .filter((s): s is BusSeatDTO => !!s)
      .sort((a, b) => {
        const numA = parseInt(a.seatNumber.replace(/\D/g, ''), 10) || a.id;
        const numB = parseInt(b.seatNumber.replace(/\D/g, ''), 10) || b.id;
        return numA - numB;
      });
  });

  readonly selectedSeatsCount = computed(() => this.selectedSeatIds().size);

  readonly totalPrice = computed(() => {
    const fare = this.trip?.price || 0;
    return fare * this.selectedSeatsCount();
  });

  readonly maxSeatsLimit = 6;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.trip) {
      this.resetSelectionState();
      this.loadSeatsAndAvailability();
    }
  }

  ngOnDestroy(): void {
    // Component teardown
  }

  /**
   * Resets local selection and error states when opening a new dialog.
   */
  private resetSelectionState(): void {
    this.error.set(null);
    this.selectedSeatIds.set(new Set());
    this.showPaymentPlaceholder.set(false);
    this.createdBookings.set([]);
  }

  /**
   * Loads bus seats and current trip bookings from the backend.
   */
  async loadSeatsAndAvailability(): Promise<void> {
    if (!this.trip) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      // 1. Fetch all seats for the trip's bus
      const seats = await firstValueFrom(
        this.busSeatService.getBusSeatsByBusId(this.trip.busId).pipe(
          catchError((err) => {
            console.error('Failed to load bus seats:', err);
            return of([] as BusSeatDTO[]);
          })
        )
      );

      this.allSeats.set(seats);
      const rows = this.buildSeatRows(seats);
      this.seatRows.set(rows);

      // 2. Fetch occupied seats for this specific trip
      await this.refreshBookedSeats();

      // 3. Restore draft selections if customer just logged in
      this.checkAndRestoreDraft();
    } catch (err: unknown) {
      console.error('Seat loading pipeline error:', err);
      this.error.set(extractErrorMessage(err, 'Failed to load bus seat availability.'));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Refreshes booked seat IDs from the backend.
   */
  private async refreshBookedSeats(): Promise<void> {
    if (!this.trip) return;

    // Occupied seat IDs set
    const booked = new Set<number>();

    // If user is authenticated, query the trip's existing active bookings
    if (this.authService.isAuthenticated()) {
      try {
        const bookingsPage = await firstValueFrom(
          this.busBookingService.getBusBookingsByBusTripId(this.trip.id, { size: 100 }).pipe(
            catchError((err) => {
              console.warn('Could not load bookings for trip:', err);
              return of({ content: [] });
            })
          )
        );

        const activeBookings = (bookingsPage?.content || []).filter(
          (b) => b.status === 'CONFIRMED' || b.status === 'PENDING'
        );

        activeBookings.forEach((b) => booked.add(b.seatId));
      } catch (err) {
        console.warn('Failed to query trip bookings:', err);
      }
    }

    this.bookedSeatIds.set(booked);
  }

  /**
   * Constructs organized 2+2 (or coach standard) rows with aisle spacing.
   */
  private buildSeatRows(seats: BusSeatDTO[]): SeatRow[] {
    if (!seats || seats.length === 0) return [];

    // Check if seats contain letter suffixes (e.g., 1A, 1B, 1C, 1D)
    const hasLetters = seats.some((s) => /[A-Za-z]/.test(s.seatNumber));

    if (hasLetters) {
      const rowMap = new Map<number, BusSeatDTO[]>();
      for (const seat of seats) {
        const match = seat.seatNumber.match(/^(\d+)/);
        const rowNum = match ? parseInt(match[1], 10) : 1;
        if (!rowMap.has(rowNum)) {
          rowMap.set(rowNum, []);
        }
        rowMap.get(rowNum)!.push(seat);
      }

      const sortedRowNums = Array.from(rowMap.keys()).sort((a, b) => a - b);
      return sortedRowNums.map((rowNum) => {
        const rowSeats = rowMap.get(rowNum)!;
        rowSeats.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
        const left = rowSeats.slice(0, 2);
        const right = rowSeats.slice(2, 4);
        return {
          rowNumber: rowNum,
          leftSeats: [left[0] || null, left[1] || null],
          rightSeats: [right[0] || null, right[1] || null],
        };
      });
    }

    // Purely numeric or sequential seat numbers
    const sortedSeats = [...seats].sort((a, b) => {
      const numA = parseInt(a.seatNumber.replace(/\D/g, ''), 10) || a.id;
      const numB = parseInt(b.seatNumber.replace(/\D/g, ''), 10) || b.id;
      return numA - numB;
    });

    const rows: SeatRow[] = [];
    const total = sortedSeats.length;
    let seatIdx = 0;
    let rowNum = 1;

    while (seatIdx < total) {
      const remaining = total - seatIdx;

      // Handle rear 5-seat row if bus ends with 5 seats
      if (remaining === 5) {
        rows.push({
          rowNumber: rowNum,
          leftSeats: [sortedSeats[seatIdx], sortedSeats[seatIdx + 1]],
          rightSeats: [
            sortedSeats[seatIdx + 2],
            sortedSeats[seatIdx + 3],
            sortedSeats[seatIdx + 4],
          ],
        });
        break;
      }

      const left1 = sortedSeats[seatIdx] || null;
      const left2 = sortedSeats[seatIdx + 1] || null;
      const right1 = sortedSeats[seatIdx + 2] || null;
      const right2 = sortedSeats[seatIdx + 3] || null;

      rows.push({
        rowNumber: rowNum,
        leftSeats: [left1, left2].filter(Boolean) as BusSeatDTO[],
        rightSeats: [right1, right2].filter(Boolean) as BusSeatDTO[],
      });

      seatIdx += 4;
      rowNum++;
    }

    return rows;
  }

  /**
   * Toggles seat selection for available seats.
   */
  onSeatClick(seat: BusSeatDTO): void {
    if (this.isSeatBooked(seat.id)) {
      return;
    }

    const currentSelected = new Set(this.selectedSeatIds());

    if (currentSelected.has(seat.id)) {
      currentSelected.delete(seat.id);
    } else {
      if (currentSelected.size >= this.maxSeatsLimit) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Seat Limit Reached',
          detail: `You can select up to ${this.maxSeatsLimit} seats per booking.`,
          life: 4000,
        });
        return;
      }
      currentSelected.add(seat.id);
    }

    this.selectedSeatIds.set(currentSelected);
  }

  isSeatSelected(seatId: number): boolean {
    return this.selectedSeatIds().has(seatId);
  }

  isSeatBooked(seatId: number): boolean {
    return this.bookedSeatIds().has(seatId);
  }

  removeSeat(seatId: number): void {
    const current = new Set(this.selectedSeatIds());
    current.delete(seatId);
    this.selectedSeatIds.set(current);
  }

  /**
   * Restores customer's saved seat draft from sessionStorage if returning from login.
   */
  private checkAndRestoreDraft(): void {
    if (!this.trip) return;
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;

    const draftKey = `travelease_bus_draft_${this.trip.id}`;
    const raw = sessionStorage.getItem(draftKey);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      // Valid draft within 30 minutes
      if (data && data.tripId === this.trip.id && Array.isArray(data.seatIds)) {
        const isFresh = Date.now() - (data.timestamp || 0) < 30 * 60 * 1000;
        if (isFresh) {
          const restored = new Set<number>();
          let hadConflict = false;

          for (const sId of data.seatIds) {
            if (!this.bookedSeatIds().has(sId)) {
              restored.add(sId);
            } else {
              hadConflict = true;
            }
          }

          if (restored.size > 0) {
            this.selectedSeatIds.set(restored);
            this.messageService.add({
              severity: 'info',
              summary: 'Selection Restored',
              detail: `Restored ${restored.size} seat(s) from your previous session.`,
              life: 5000,
            });
          }

          if (hadConflict) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Seat Unavailable',
              detail: 'One or more of your previously chosen seats has been booked by another passenger.',
              life: 6000,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse bus booking draft:', e);
    } finally {
      sessionStorage.removeItem(draftKey);
    }
  }

  /**
   * Action when an unauthenticated guest clicks proceed to book.
   * Saves selection and redirects to Login with returnUrl.
   */
  proceedAsGuest(): void {
    if (!this.trip) return;

    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      const draftKey = `travelease_bus_draft_${this.trip.id}`;
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          tripId: this.trip.id,
          seatIds: Array.from(this.selectedSeatIds()),
          timestamp: Date.now(),
        })
      );
    }

    this.messageService.add({
      severity: 'info',
      summary: 'Sign In Required',
      detail: 'Please log in to finalize your booking. Your selected seats have been saved.',
      life: 4000,
    });

    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  /**
   * Submits booking requests sequentially for all selected seats.
   * Concurrency & Conflict Protection:
   * Backend uses pessimistic row locking (findByIdForUpdate on BusTrip).
   * Sequential dispatch prevents connection pool lock deadlocks.
   */
  async submitBookings(): Promise<void> {
    if (!this.trip) return;

    if (!this.isAuthenticated()) {
      this.proceedAsGuest();
      return;
    }

    const seatsToBook = this.selectedSeatsList();
    if (seatsToBook.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Seats Selected',
        detail: 'Please select at least one available seat to proceed.',
        life: 3000,
      });
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const currentUser = this.authService.currentUser();
    const todayStr = new Date().toISOString().split('T')[0];
    const createdList: BusBookingDTO[] = [];

    for (const seat of seatsToBook) {
      try {
        const payload: BusBookingRequestDTO = {
          busTripId: this.trip.id,
          seatId: seat.id,
          status: 'PENDING',
          price: this.trip.price,
          bookingDate: todayStr,
          userId: currentUser?.id || 0,
        };

        const created = await firstValueFrom(this.busBookingService.createBusBooking(payload));
        createdList.push(created);
      } catch (err: unknown) {
        console.error(`Booking submission error for seat ${seat.seatNumber}:`, err);
        const friendlyMsg = extractErrorMessage(
          err,
          `Seat ${seat.seatNumber} could not be reserved.`
        );

        // Conflict handling: refresh availability immediately
        await this.refreshBookedSeats();

        if (createdList.length > 0) {
          // Partial success: inform user about partial reservation
          this.messageService.add({
            severity: 'warn',
            summary: 'Partial Reservation',
            detail: `Seat ${seat.seatNumber} could not be booked (${friendlyMsg}), but ${createdList.length} seat(s) were successfully reserved.`,
            life: 8000,
          });

          this.createdBookings.set(createdList);
          this.showPaymentPlaceholder.set(true);
          this.submitting.set(false);
          this.bookingComplete.emit(createdList);
          return;
        }

        // None succeeded: show error, remove conflicted seat
        this.error.set(`Seat ${seat.seatNumber}: ${friendlyMsg}`);
        this.messageService.add({
          severity: 'error',
          summary: 'Seat Unavailable',
          detail: friendlyMsg,
          life: 6000,
        });

        // Unselect conflicted seat
        const currentSel = new Set(this.selectedSeatIds());
        currentSel.delete(seat.id);
        this.selectedSeatIds.set(currentSel);

        this.submitting.set(false);
        return;
      }
    }

    // All seats booked successfully!
    this.createdBookings.set(createdList);
    this.showPaymentPlaceholder.set(true);
    this.submitting.set(false);
    this.bookingComplete.emit(createdList);
  }

  /**
   * Closes the dialog and informs parent.
   */
  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetSelectionState();
  }
}
