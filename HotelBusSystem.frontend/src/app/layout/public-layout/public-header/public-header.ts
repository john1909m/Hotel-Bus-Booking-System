import {
  Component, signal, inject, HostListener, ChangeDetectionStrategy, OnInit
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { LogoutConfirmationDialogComponent } from '../../../shared/components/logout-confirmation-dialog/logout-confirmation-dialog.component';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LogoutConfirmationDialogComponent],
  templateUrl: './public-header.html',
  styleUrl: './public-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHeader implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);

  readonly theme = this.themeService.theme;
  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentLanguage = this.languageService.currentLanguage;

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

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  readonly showLogoutConfirm = signal<boolean>(false);

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.showLogoutConfirm.set(true);
  }

  onLogoutCancelled(): void {
    this.showLogoutConfirm.set(false);
  }

  onLogoutConfirmed(): void {
    this.showLogoutConfirm.set(false);
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

  smoothScroll(event: Event, id: string): void {
    event.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      this.router.navigate(['/'], { fragment: id });
    }
    this.menuOpen.set(false);
  }
}
