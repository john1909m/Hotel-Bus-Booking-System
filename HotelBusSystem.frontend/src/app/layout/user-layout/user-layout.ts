import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserHeader } from './user-header/user-header';
import { AiChatWidgetComponent } from '../../shared/components/ai-chat-widget/ai-chat-widget.component';
import { GlobalBookingTriggerComponent } from '../../shared/components/global-booking-trigger/global-booking-trigger.component';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    UserHeader,
    AiChatWidgetComponent,
    GlobalBookingTriggerComponent,
  ],
  template: `
    <app-user-header />
    <main class="user-main" id="user-main-content">
      <router-outlet />
    </main>
    <app-ai-chat-widget />
    <app-global-booking-trigger />
  `,
  styles: [`
    :host { display: block; }
    .user-main { padding-top: 68px; min-height: 100vh; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserLayout {}
