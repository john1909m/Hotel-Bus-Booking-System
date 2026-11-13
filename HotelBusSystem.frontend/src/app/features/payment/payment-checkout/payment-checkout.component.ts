import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { BookingStateService } from '../../../core/services/booking-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { HotelBookingRequestDTO, HotelBookingDTO } from '../../../core/models/Hotel/hotel-booking.model';
import { BusBookingRequestDTO, BusBookingDTO } from '../../../core/models/Bus/bus-booking.model';
import { paymentMethod } from '../../../core/models/Payment/payment.model';
import { roomType } from '../../../core/models/Room/room.model';

export interface PaymentOption {
  id: paymentMethod;
  title: string;
  subtitle: string;
  icon: string;
}

@Component({
  selector: 'app-payment-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    DatePipe,
    RouterLink,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    MessageModule,
  ],
  templateUrl: './payment-checkout.component.html',
  styleUrl: './payment-checkout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentCheckoutComponent {
  readonly state = inject(BookingStateService);
  readonly authService = inject(AuthService);
  private readonly hotelBookingService = inject(HotelBookingService);
  private readonly busBookingService = inject(BusBookingService);
  private readonly router = inject(Router);

  // ── Payment Methods ─────────────────────────────────────────
  readonly paymentMethods: readonly PaymentOption[] = [
    {
      id: 'CREDIT_CARD',
      title: 'Credit / Debit Card',
      subtitle: 'Visa, Mastercard, Meeza, American Express',
      icon: 'card',
    },
    {
      id: 'PAYPAL',
      title: 'PayPal',
      subtitle: 'Fast, secure checkout with your PayPal account',
      icon: 'paypal',
    },
    {
      id: 'BANK_TRANSFER',
      title: 'Bank Transfer / Wire',
      subtitle: 'Direct transfer to TravelEase corporate bank account',
      icon: 'bank',
    },
  ];

  readonly selectedMethod = signal<paymentMethod>('CREDIT_CARD');

  // ── Card Form State ─────────────────────────────────────────
  readonly cardholderName = signal<string>('');
  readonly cardNumber = signal<string>('');
  readonly cardExpiry = signal<string>('');
  readonly cardCvv = signal<string>('');

  // ── Processing, Confirmation & Failure State ────────────────
  readonly isProcessing = signal<boolean>(false);
  readonly validationErrorMessage = signal<string | null>(null);
  readonly partialFailureMessage = signal<string | null>(null);
  readonly confirmationDialogVisible = signal<boolean>(false);
  readonly confirmedReference = signal<string>('');
  readonly createdHotelBooking = signal<HotelBookingDTO | null>(null);
  readonly createdBusBookings = signal<BusBookingDTO[]>([]);

  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  selectPaymentMethod(method: paymentMethod): void {
    this.selectedMethod.set(method);
  }

  onRemoveRoom(roomId: number): void {
    this.state.removeRoomFromHotel(roomId);
  }

  onRemoveTransportation(): void {
    this.state.clearTransportationSelection();
  }

  onClearSummary(): void {
    this.state.clearSummary();
    this.router.navigate(['/hotels']);
  }

  validateBooking(): { isValid: boolean; error?: string } {
    if (!this.state.hasAnySelection()) {
      return { isValid: false, error: 'Your itinerary is empty. Please select a hotel or bus trips to proceed.' };
    }

    if (!this.authService.isAuthenticated()) {
      return { isValid: false, error: 'You must be signed in to complete your reservation. Please sign in.' };
    }

    if (this.state.hasHotel()) {
      const hb = this.state.hotelBooking();
      if (!hb || !hb.hotel || !hb.selectedRooms || hb.selectedRooms.length === 0) {
        return { isValid: false, error: 'Hotel selection is incomplete. Please select at least one room.' };
      }
      if (!hb.checkIn || !hb.checkOut) {
        return { isValid: false, error: 'Check-in and check-out dates are required.' };
      }
      if (hb.adultsCount < 1) {
        return { isValid: false, error: 'At least one adult guest is required.' };
      }
    }

    if (this.state.hasTransportation()) {
      const tb = this.state.transportationBooking();
      if (tb?.outgoing && (!tb.outgoing.trip?.id || !tb.outgoing.selectedSeats || tb.outgoing.selectedSeats.length === 0)) {
        return { isValid: false, error: 'Outgoing bus trip has no seats selected.' };
      }
      if (tb?.returnTrip && (!tb.returnTrip.trip?.id || !tb.returnTrip.selectedSeats || tb.returnTrip.selectedSeats.length === 0)) {
        return { isValid: false, error: 'Return bus trip has no seats selected.' };
      }
    }

    return { isValid: true };
  }

  onProcessPayment(): void {
    if (this.isProcessing()) return;

    this.validationErrorMessage.set(null);
    this.partialFailureMessage.set(null);

    const validation = this.validateBooking();
    if (!validation.isValid) {
      this.validationErrorMessage.set(validation.error || 'Invalid booking state.');
      if (!this.authService.isAuthenticated()) {
        this.router.navigate(['/login'], { queryParams: { returnUrl: '/payment' } });
      }
      return;
    }

    const currentUserId = this.authService.currentUser()?.id || 1;
    const todayIso = new Date().toISOString().slice(0, 10);

    // Build bus payloads
    const busPayloads: BusBookingRequestDTO[] = [];
    const tb = this.state.transportationBooking();

    if (tb?.outgoing && tb.outgoing.selectedSeats && tb.outgoing.selectedSeats.length > 0) {
      for (const seat of tb.outgoing.selectedSeats) {
        busPayloads.push({
          bookingDate: (tb.outgoing.trip.departure || todayIso).slice(0, 10),
          status: 'PENDING',
          price: tb.outgoing.trip.price || 0,
          userId: currentUserId,
          busTripId: tb.outgoing.trip.id,
          seatId: seat.id,
        });
      }
    }

    if (tb?.returnTrip && tb.returnTrip.selectedSeats && tb.returnTrip.selectedSeats.length > 0) {
      for (const seat of tb.returnTrip.selectedSeats) {
        busPayloads.push({
          bookingDate: (tb.returnTrip.trip.departure || todayIso).slice(0, 10),
          status: 'PENDING',
          price: tb.returnTrip.trip.price || 0,
          userId: currentUserId,
          busTripId: tb.returnTrip.trip.id,
          seatId: seat.id,
        });
      }
    }

    this.isProcessing.set(true);

    if (busPayloads.length > 0) {
      // Step A: Create bus bookings first
      const busObservables = busPayloads.map((p) =>
        this.busBookingService.createBusBooking(p).pipe(
          catchError((err) => {
            return of({ __isError: true, error: err, payload: p } as any);
          })
        )
      );

      forkJoin(busObservables).subscribe({
        next: (results: any[]) => {
          const successfulBuses: BusBookingDTO[] = [];
          const failedBuses: any[] = [];

          for (const res of results) {
            if (res && res.__isError) {
              failedBuses.push(res);
            } else if (res && res.id) {
              successfulBuses.push(res);
            }
          }

          if (failedBuses.length > 0) {
            this.isProcessing.set(false);
            const successText = successfulBuses.length > 0
              ? `Created ${successfulBuses.length} bus booking(s) with status PENDING (#${successfulBuses.map((b) => b.id).join(', #')}). `
              : '';
            const failText = `Failed to reserve ${failedBuses.length} bus seat(s): ${failedBuses[0]?.error?.message || 'Seat unavailable or server error'}.`;
            this.partialFailureMessage.set(`${successText}${failText} Please review your selection and retry.`);
            return;
          }

          // All bus bookings created successfully, now create hotel booking if present
          this.createdBusBookings.set(successfulBuses);
          this.createHotelBookingStep(successfulBuses);
        },
        error: (err) => {
          this.isProcessing.set(false);
          this.partialFailureMessage.set(`Failed to reserve bus seats: ${err?.message || 'Server error'}. No bookings were confirmed.`);
        },
      });
    } else {
      // Hotel-only booking
      this.createHotelBookingStep([]);
    }
  }

  private createHotelBookingStep(createdBuses: BusBookingDTO[]): void {
    if (!this.state.hasHotel()) {
      // Bus-only booking completed
      this.finalizeSuccess(null, createdBuses);
      return;
    }

    const hb = this.state.hotelBooking()!;
    const roomIds = hb.selectedRooms.map((r) => r.id);
    const childAges: number[] = hb.children
      .map((c) => c.age)
      .filter((a): a is number => typeof a === 'number');

    const hotelPayload: HotelBookingRequestDTO = {
      checkIn: hb.checkIn,
      checkOut: hb.checkOut,
      guests: hb.adultsCount + childAges.length,
      adults: hb.adultsCount,
      childAges,
      roomId: roomIds[0],
      roomIds,
    };

    // Note: Decision Option A - Payment record is created by ADMIN during review via POST /api/payments.
    // TODO: Payment record creation is handled by ADMIN review via POST /api/payments under Option A.

    this.hotelBookingService.createHotelBooking(hotelPayload).subscribe({
      next: (createdHotel) => {
        this.finalizeSuccess(createdHotel, createdBuses);
      },
      error: (err) => {
        this.isProcessing.set(false);
        if (createdBuses.length > 0) {
          const busIds = createdBuses.map((b) => `#${b.id}`).join(', ');
          this.partialFailureMessage.set(
            `Bus reservation(s) (${busIds}) were created with status PENDING, but hotel booking creation failed: ${err?.message || 'Server error'}. Please retry hotel booking or contact administration.`
          );
        } else {
          this.partialFailureMessage.set(`Hotel booking failed: ${err?.message || 'Room unavailable or invalid dates'}. No booking was created.`);
        }
      },
    });
  }

  private finalizeSuccess(hotel: HotelBookingDTO | null, buses: BusBookingDTO[]): void {
    this.isProcessing.set(false);
    this.createdHotelBooking.set(hotel);
    this.createdBusBookings.set(buses);

    const ref = hotel ? `HB-${hotel.id}` : (buses.length > 0 ? `BB-${buses[0].id}` : 'BK-PENDING');
    this.confirmedReference.set(ref);

    // Clear booking summary state on complete success
    this.state.clearSummary();
    this.confirmationDialogVisible.set(true);
  }

  onConfirmationClosed(): void {
    this.confirmationDialogVisible.set(false);
    this.router.navigate(['/hotels']);
  }

  getRoomTypeLabel(type: roomType | string): string {
    switch (type) {
      case 'SINGLE': return 'Single Room';
      case 'DOUBLE': return 'Double Room';
      case 'SUITE': return 'Executive Suite';
      case 'DELUXE': return 'Deluxe Room';
      default: return type || 'Standard Room';
    }
  }
}
