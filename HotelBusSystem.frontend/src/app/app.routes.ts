import { Routes } from '@angular/router';
import { PublicLayout } from './layout/public-layout/public-layout';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // ── Public (Landing) ──────────────────────────────────────
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/landing/landing').then(m => m.Landing),
        title: 'TravelEase — Hotels & Bus Booking',
      },
      {
        path: 'hotels',
        loadComponent: () =>
          import('./features/hotels/hotel-listing/hotel-listing').then(m => m.HotelListing),
        title: 'TravelEase — Browse Hotels',
      },
    ],
  },

  // ── Auth pages (guest-only) ───────────────────────────────
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./layout/auth-layout/login/login.component').then(m => m.LoginComponent),
    title: 'TravelEase — Sign In',
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./layout/auth-layout/register/register.component').then(m => m.RegisterComponent),
    title: 'TravelEase — Register',
  },

  // ── Customer Layout (USER role) ───────────────────────────
  {
    path: 'user',
    canActivate: [authGuard, roleGuard(['USER'])],
    loadComponent: () =>
      import('./layout/user-layout/user-layout').then(m => m.UserLayout),
    children: [
      {
        path: 'bus-bookings',
        loadComponent: () =>
          import('./layout/user-layout/BusBookings/BusBookings.component').then(m => m.BusBookingsComponent),
        title: 'TravelEase — My Bus Bookings',
      },
      {
        path: '',
        redirectTo: 'bus-bookings',
        pathMatch: 'full',
      },
    ],
  },

  // ── Admin Layout (ADMIN role) ─────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['ADMIN'])],
    loadComponent: () =>
      import('./layout/admin-layout/admin-layout').then(m => m.AdminLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./layout/admin-layout/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard),
        title: 'TravelEase Admin — Dashboard',
      },
      {
        path: 'hotels',
        loadComponent: () =>
          import('./layout/admin-layout/hotels-management/hotels-management').then(m => m.HotelsManagement),
        title: 'TravelEase Admin — Hotels Management',
      },
      // Pending pages — routes reserved for future implementation:
      // /admin/rooms, /admin/users, /admin/buses,
      // /admin/bus-seats, /admin/bus-stops, /admin/bus-routes,
      // /admin/bus-trips, /admin/hotel-bookings, /admin/bus-bookings,
      // /admin/payments
    ],
  },

  // ── Wildcard ──────────────────────────────────────────────
  {
    path: '**',
    redirectTo: '',
  },
];
