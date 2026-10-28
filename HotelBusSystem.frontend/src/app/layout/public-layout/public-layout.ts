import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicHeader } from './public-header/public-header';
import { PublicFooter } from './public-footer/public-footer';
import { AiChatWidgetComponent } from '../../shared/components/ai-chat-widget/ai-chat-widget.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, PublicHeader, PublicFooter, AiChatWidgetComponent],
  template: `
    <app-public-header />
    <main class="public-main" id="main-content">
      <router-outlet />
    </main>
    <app-public-footer />
    <app-ai-chat-widget />
  `,
  styles: [`
    :host { display: block; }
    .public-main { padding-top: 68px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicLayout {}
