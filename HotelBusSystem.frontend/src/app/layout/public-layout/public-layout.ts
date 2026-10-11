import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicHeader } from './public-header/public-header';
import { PublicFooter } from './public-footer/public-footer';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, PublicHeader, PublicFooter],
  template: `
    <app-public-header />
    <main class="public-main" id="main-content">
      <router-outlet />
    </main>
    <app-public-footer />
  `,
  styles: [`
    :host { display: block; }
    .public-main { padding-top: 68px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicLayout {}
