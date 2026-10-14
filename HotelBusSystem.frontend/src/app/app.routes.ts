import { Routes } from '@angular/router';
import { PublicLayout } from './layout/public-layout/public-layout';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
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
    ],
  },
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
  {
    path: 'user',
    canActivate: [authGuard, roleGuard(['USER', 'ADMIN'])],
    children: [
      {
        path: 'bus-bookings',
        loadComponent: () =>
          import('./layout/user-layout/BusBookings/BusBookings.component').then(m => m.BusBookingsComponent),
        title: 'Bus Bookings',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
