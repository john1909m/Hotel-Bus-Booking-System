import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserHeader } from './user-header/user-header';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [RouterOutlet, UserHeader],
  template: `
    <app-user-header />
    <main class="user-main" id="user-main-content">
      <router-outlet />
    </main>
  `,
  styles: [`
    :host { display: block; }
    .user-main { padding-top: 68px; min-height: 100vh; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserLayout {}
