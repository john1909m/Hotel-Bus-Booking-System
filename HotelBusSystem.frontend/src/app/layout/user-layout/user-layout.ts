import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserHeader } from './user-header/user-header';
import { AiChatWidgetComponent } from '../../shared/components/ai-chat-widget/ai-chat-widget.component';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [RouterOutlet, UserHeader, AiChatWidgetComponent],
  template: `
    <app-user-header />
    <main class="user-main" id="user-main-content">
      <router-outlet />
    </main>
    <app-ai-chat-widget />
  `,
  styles: [`
    :host { display: block; }
    .user-main { padding-top: 68px; min-height: 100vh; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserLayout {}
