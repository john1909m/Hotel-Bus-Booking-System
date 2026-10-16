import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  HostListener,
  OnInit,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './user-header.html',
  styleUrl: './user-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserHeader implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly theme = this.themeService.theme;
  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = this.authService.isAuthenticated;

  scrolled = signal(false);
  menuOpen = signal(false);

  ngOnInit(): void {
    this.authService.ensureInitialized();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 20);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.closeMenu();
        this.router.navigate(['/']);
      },
      error: () => {
        this.closeMenu();
        this.router.navigate(['/']);
      },
    });
  }
}
