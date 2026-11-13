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
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../core/services/auth.service';
import { BookingStateService } from '../../../core/services/booking-state.service';
import { HotelBookingSummaryComponent } from '../../../features/hotels/hotel-details/hotel-booking-summary/hotel-booking-summary.component';

@Component({
  selector: 'app-global-booking-trigger',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    ButtonModule,
    HotelBookingSummaryComponent,
  ],
  template: `
    @if (isTriggerVisible()) {
      <button
        pButton
        type="button"
        id="global-booking-pill-trigger"
        class="global-booking-trigger-pill"
        (click)="toggleSummary()"
        [attr.aria-label]="'Booking Summary: ' + itemCount() + ' items, ' + (totalAmount() | number:'1.2-2') + ' EGP'">
        <div class="trigger-pill-icon" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </div>
        <span class="trigger-count-badge">{{ itemCount() }}</span>
        <span class="trigger-text-label">{{ itemCount() === 1 ? '1 Item' : itemCount() + ' Items' }}</span>
        <span class="trigger-divider">&bull;</span>
        <strong class="trigger-price">{{ totalAmount() | number:'1.2-2' }} EGP</strong>
      </button>
    }

    <!-- Single Global Booking Summary Drawer Host -->
    <app-hotel-booking-summary
      [visible]="isDrawerOpen()"
      (visibleChange)="onDrawerVisibleChange($event)">
    </app-hotel-booking-summary>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .global-booking-trigger-pill {
      position: fixed;
      bottom: 85px;
      right: 24px;
      z-index: 1040;
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.65rem 1.15rem;
      border-radius: var(--radius-full, 9999px);
      background: var(--bg-surface, #ffffff);
      color: var(--text-primary, #0f172a);
      border: 1px solid var(--border-color, #e2e8f0);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08);
      cursor: pointer;
      font-size: 0.85rem;
      transition: all var(--transition-fast, 0.2s);
      animation: pillFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    [data-theme="dark"] .global-booking-trigger-pill {
      background: var(--bg-elevated, #1e293b);
      color: #f8fafc;
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
    }

    .global-booking-trigger-pill:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
      border-color: var(--color-primary, #009b77);
    }

    .trigger-pill-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary, #009b77);
    }

    .trigger-count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 0.35rem;
      border-radius: var(--radius-full, 9999px);
      background: var(--color-primary, #009b77);
      color: #ffffff;
      font-size: 0.725rem;
      font-weight: 800;
    }

    .trigger-text-label {
      font-weight: 700;
      color: var(--text-primary);
    }

    .trigger-divider {
      color: var(--text-muted, #94a3b8);
      font-size: 0.8rem;
    }

    .trigger-price {
      font-weight: 800;
      color: var(--color-primary, #009b77);
      font-size: 0.9rem;
    }

    @keyframes pillFadeIn {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (max-width: 600px) {
      .global-booking-trigger-pill {
        bottom: 80px;
        right: 16px;
        padding: 0.55rem 0.95rem;
        gap: 0.5rem;
        font-size: 0.8rem;
      }
      .trigger-text-label {
        display: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalBookingTriggerComponent implements OnInit, OnDestroy {
  readonly bookingState = inject(BookingStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUrl = signal<string>(this.router.url);
  private routerSub?: Subscription;

  readonly isOnPaymentRoute = computed(() => {
    return this.currentUrl().includes('/payment');
  });

  readonly isTriggerVisible = computed(() => {
    return (
      this.bookingState.hasAnySelection() &&
      !this.isOnPaymentRoute() &&
      !this.bookingState.hideTriggerOnPayment()
    );
  });

  readonly isDrawerOpen = computed(() => {
    return this.bookingState.summaryOpen();
  });

  readonly itemCount = computed(() => {
    return this.bookingState.summaryItemsCount();
  });

  readonly totalAmount = computed(() => {
    return this.bookingState.totalCombinedPrice();
  });

  ngOnInit(): void {
    this.currentUrl.set(this.router.url);
    this.checkResumeSummary();
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
        if (event.url.includes('/payment')) {
          this.bookingState.hideTriggerOnPayment.set(true);
        } else {
          this.bookingState.hideTriggerOnPayment.set(false);
          this.checkResumeSummary();
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private checkResumeSummary(): void {
    if (!this.bookingState.resumeSummaryAfterLogin()) return;
    if (this.authService.isAuthenticated()) {
      this.bookingState.setResumeSummaryAfterLogin(false);
      this.bookingState.openSummary();
    } else {
      this.authService.ensureInitialized().then(() => {
        if (this.bookingState.resumeSummaryAfterLogin() && this.authService.isAuthenticated()) {
          this.bookingState.setResumeSummaryAfterLogin(false);
          this.bookingState.openSummary();
        }
      });
    }
  }

  openSummary(): void {
    this.bookingState.openSummary();
  }

  toggleSummary(): void {
    this.bookingState.toggleSummary();
  }

  onDrawerVisibleChange(visible: boolean): void {
    this.bookingState.setSummaryOpen(visible);
  }
}
