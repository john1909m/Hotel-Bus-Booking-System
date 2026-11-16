import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  HostListener,
  OnInit,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { LogoutConfirmationDialogComponent } from '../../../shared/components/logout-confirmation-dialog/logout-confirmation-dialog.component';

@Component({
  selector: 'app-user-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LogoutConfirmationDialogComponent, TranslatePipe],
  templateUrl: './user-header.html',
  styleUrl: './user-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserHeader implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService, { optional: true });
  private readonly router = inject(Router);

  readonly theme = this.themeService.theme;
  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly isArabic = computed(() => this.languageService?.isRtl() ?? false);

  scrolled = signal(false);
  menuOpen = signal(false);

  toggleLanguage(): void {
    this.languageService?.toggleLanguage();
  }

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
}
