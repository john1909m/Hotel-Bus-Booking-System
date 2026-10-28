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
      {
        path: 'hotels/:id',
        loadComponent: () =>
          import('./features/hotels/hotel-details/hotel-details').then(m => m.HotelDetails),
        title: 'TravelEase — Hotel Details & Rooms',
      },
      {
        path: 'buses/results',
        loadComponent: () =>
          import('./features/buses/bus-search-results/bus-search-results').then(m => m.BusSearchResultsComponent),
        title: 'TravelEase — Bus Search Results',
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
        path: 'hotel-bookings',
        loadComponent: () =>
          import('./layout/user-layout/hotel-bookings/hotel-bookings.component').then(m => m.HotelBookingsComponent),
        title: 'TravelEase — My Hotel Bookings',
      },
      {
        path: 'bus-bookings',
        loadComponent: () =>
          import('./layout/user-layout/BusBookings/BusBookings.component').then(m => m.BusBookingsComponent),
        title: 'TravelEase — My Bus Bookings',
      },
      {
        path: '',
        redirectTo: 'hotel-bookings',
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
      {
        path: 'hotel-images',
        loadComponent: () =>
          import('./layout/admin-layout/hotel-images-management/hotel-images-management').then(m => m.HotelImagesManagement),
        title: 'TravelEase Admin — Hotel Images Management',
      },

      {
        path: 'rooms',
        loadComponent: () =>
          import('./layout/admin-layout/rooms-management/rooms-management').then(m => m.RoomsManagement),
        title: 'TravelEase Admin — Rooms Management',
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./layout/admin-layout/users-management/users-management').then(m => m.UsersManagement),
        title: 'TravelEase Admin — Users Management',
      },
      {
        path: 'buses',
        loadComponent: () =>
          import('./layout/admin-layout/buses-management/buses-management').then(m => m.BusesManagement),
        title: 'TravelEase Admin — Buses Fleet',
      },
      {
        path: 'bus-seats',
        loadComponent: () =>
          import('./layout/admin-layout/bus-seats-management/bus-seats-management').then(m => m.BusSeatsManagement),
        title: 'TravelEase Admin — Bus Seats',
      },
      {
        path: 'bus-stops',
        loadComponent: () =>
          import('./layout/admin-layout/bus-stops-management/bus-stops-management').then(m => m.BusStopsManagement),
        title: 'TravelEase Admin — Bus Stops',
      },
      {
        path: 'bus-routes',
        loadComponent: () =>
          import('./layout/admin-layout/bus-routes-management/bus-routes-management').then(m => m.BusRoutesManagement),
        title: 'TravelEase Admin — Bus Routes',
      },
      {
        path: 'bus-trips',
        loadComponent: () =>
          import('./layout/admin-layout/bus-trips-management/bus-trips-management').then(m => m.BusTripsManagement),
        title: 'TravelEase Admin — Bus Trips',
      },
      {
        path: 'hotel-bookings',
        loadComponent: () =>
          import('./layout/admin-layout/hotel-bookings-management/hotel-bookings-management').then(m => m.HotelBookingsManagement),
        title: 'TravelEase Admin — Hotel Bookings',
      },
      {
        path: 'bus-bookings',
        loadComponent: () =>
          import('./layout/admin-layout/bus-bookings-management/bus-bookings-management').then(m => m.BusBookingsManagement),
        title: 'TravelEase Admin — Bus Bookings',
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./layout/admin-layout/payments-management/payments-management').then(m => m.PaymentsManagement),
        title: 'TravelEase Admin — Payments',
      },
    ],
  },

  // ── Wildcard ──────────────────────────────────────────────
  {
    path: '**',
    redirectTo: '',
  },
];
