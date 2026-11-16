import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { LogoutConfirmationDialogComponent } from '../../shared/components/logout-confirmation-dialog/logout-confirmation-dialog.component';

interface NavItem {
  label: string;
  labelKey: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LogoutConfirmationDialogComponent, TranslatePipe],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService, { optional: true });

  readonly theme = this.themeService.theme;
  readonly currentUser = this.authService.currentUser;
  readonly isArabic = computed(() => this.languageService?.isRtl() ?? false);

  sidebarOpen = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',      labelKey: 'admin.nav.dashboard',     route: '/admin',                 icon: '▦' },
    { label: 'Hotels',         labelKey: 'admin.nav.hotels',        route: '/admin/hotels',          icon: '🏨' },
    { label: 'Hotel Images',   labelKey: 'admin.nav.hotelImages',   route: '/admin/hotel-images',    icon: '🖼️' },
    { label: 'Rooms',          labelKey: 'admin.nav.rooms',          route: '/admin/rooms',           icon: '🛏' },

    { label: 'Users',          labelKey: 'admin.nav.users',         route: '/admin/users',           icon: '👤' },
    { label: 'Buses',          labelKey: 'admin.nav.buses',         route: '/admin/buses',           icon: '🚌' },
    { label: 'Bus Seats',      labelKey: 'admin.nav.busSeats',      route: '/admin/bus-seats',       icon: '💺' },
    { label: 'Bus Stops',      labelKey: 'admin.nav.busStops',      route: '/admin/bus-stops',       icon: '🚏' },
    { label: 'Routes',         labelKey: 'admin.nav.routes',        route: '/admin/bus-routes',      icon: '🗺' },
    { label: 'Trips',          labelKey: 'admin.nav.trips',         route: '/admin/bus-trips',       icon: '🛣' },
    { label: 'Hotel Bookings', labelKey: 'admin.nav.hotelBookings', route: '/admin/hotel-bookings',  icon: '📋' },
    { label: 'Bus Bookings',   labelKey: 'admin.nav.busBookings',   route: '/admin/bus-bookings',    icon: '🎟' },
    { label: 'User Bookings',  labelKey: 'admin.nav.userBookings',  route: '/admin/user-bookings',   icon: '📑' },
    { label: 'Payments',       labelKey: 'admin.nav.payments',      route: '/admin/payments',        icon: '💳' },
  ];

  ngOnInit(): void {
    this.authService.ensureInitialized();
  }

  toggleLanguage(): void {
    this.languageService?.toggleLanguage();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  readonly showLogoutConfirm = signal<boolean>(false);

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.showLogoutConfirm.set(true);
  }

  onLogoutCancelled(): void {
    this.showLogoutConfirm.set(false);
  }

  onLogoutConfirmed(): void {
    this.showLogoutConfirm.set(false);
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/']),
    });
  }
}
