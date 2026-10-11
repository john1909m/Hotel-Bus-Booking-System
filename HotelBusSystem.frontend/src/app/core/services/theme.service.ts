import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'te-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly theme = signal<Theme>(this.resolveInitialTheme());

  constructor() {
    effect(() => {
      const t = this.theme();
      if (this.isBrowser) {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem(STORAGE_KEY, t);
      }
    });
  }

  toggle(): void {
    this.theme.update(t => (t === 'light' ? 'dark' : 'light'));
  }

  private resolveInitialTheme(): Theme {
    if (!this.isBrowser) return 'light';
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
