import { Routes } from '@angular/router';
import { PublicLayout } from './layout/public-layout/public-layout';

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
];
