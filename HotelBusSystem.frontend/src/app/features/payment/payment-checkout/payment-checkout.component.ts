import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { BookingStateService } from '../../../core/services/booking-state.service';
import { AuthService } from '../../../core/services/auth.service';
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
  ],
  templateUrl: './payment-checkout.component.html',
  styleUrl: './payment-checkout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentCheckoutComponent {
  readonly state = inject(BookingStateService);
  readonly authService = inject(AuthService);
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

  // ── Processing & Confirmation State ─────────────────────────
  readonly isProcessing = signal<boolean>(false);
  readonly confirmationDialogVisible = signal<boolean>(false);
  readonly confirmedReference = signal<string>('');

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

  onProcessPayment(): void {
    if (!this.state.hasAnySelection() || this.isProcessing()) return;

    this.isProcessing.set(true);

    // Simulate payment authorization & order placement
    setTimeout(() => {
      const randomRef = 'TE-' + Math.floor(100000 + Math.random() * 900000);
      this.confirmedReference.set(randomRef);
      this.isProcessing.set(false);
      this.confirmationDialogVisible.set(true);
      // Clear booking state once successfully processed
      this.state.clearSummary();
    }, 1200);
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
