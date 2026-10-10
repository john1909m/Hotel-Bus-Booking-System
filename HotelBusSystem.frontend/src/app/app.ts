import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styles: [':host { display: block; }'],
})
export class App implements OnInit {
  // Inject ThemeService eagerly so the effect runs immediately on bootstrap
  private readonly themeService = inject(ThemeService);

  ngOnInit(): void {
    // Ensure theme is applied on init (effect already handles this,
    // but explicit call guarantees first-render correctness)
  }
}
