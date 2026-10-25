import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly theme = this.themeService.theme;
  readonly currentUser = this.authService.currentUser;

  sidebarOpen = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',      route: '/admin',                 icon: '▦' },
    { label: 'Hotels',         route: '/admin/hotels',          icon: '🏨' },
    { label: 'Hotel Images',   route: '/admin/hotel-images',    icon: '🖼️' },
    { label: 'Rooms',          route: '/admin/rooms',           icon: '🛏' },

    { label: 'Users',          route: '/admin/users',           icon: '👤' },
    { label: 'Buses',          route: '/admin/buses',           icon: '🚌' },
    { label: 'Bus Seats',      route: '/admin/bus-seats',       icon: '💺' },
    { label: 'Bus Stops',      route: '/admin/bus-stops',       icon: '🚏' },
    { label: 'Routes',         route: '/admin/bus-routes',      icon: '🗺' },
    { label: 'Trips',          route: '/admin/bus-trips',       icon: '🛣' },
    { label: 'Hotel Bookings', route: '/admin/hotel-bookings',  icon: '📋' },
    { label: 'Bus Bookings',   route: '/admin/bus-bookings',    icon: '🎟' },
    { label: 'Payments',       route: '/admin/payments',        icon: '💳' },
  ];

  ngOnInit(): void {
    this.authService.ensureInitialized();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/']),
    });
  }
}
