import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  template: `
    <div class="dashboard-page">
      <h1 class="page-title">Admin Dashboard</h1>
      <p class="page-subtitle">Welcome back, <strong>{{ currentUser()?.name }}</strong>. Manage your Hotel & Bus Booking System from here.</p>
      <div class="info-card">
        <p>Select a module from the sidebar to get started.</p>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page { max-width: 900px; }
    .page-title { font-size: clamp(1.5rem, 3vw, 2rem); margin-bottom: 0.5rem; }
    .page-subtitle { color: var(--text-secondary); margin-bottom: 2rem; }
    .info-card {
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.5rem 2rem;
      color: var(--text-secondary);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard {
  readonly currentUser = inject(AuthService).currentUser;
}
