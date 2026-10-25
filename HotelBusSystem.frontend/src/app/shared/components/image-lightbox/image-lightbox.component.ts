import {
  Component,
  ChangeDetectionStrategy,
  input,
  model,
  output,
  computed,
  signal,
  effect,
  HostListener,
  ElementRef,
  viewChild,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HotelImageDto } from '../../../core/models/Image/hotel_image.model';
import { SafeImageUrlPipe, DEFAULT_IMAGE_PLACEHOLDER } from '../../../../utils/safe-image-url';

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule, SafeImageUrlPipe],
  templateUrl: './image-lightbox.component.html',
  styleUrl: './image-lightbox.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageLightboxComponent implements OnDestroy {
  // ── Inputs & Models ─────────────────────────────────────────
  readonly images = input<HotelImageDto[]>([]);
  readonly activeIndex = model<number>(0);
  readonly visible = model<boolean>(false);
  readonly title = input<string>('Hotel Photos');

  // ── Outputs ────────────────────────────────────────────────
  readonly closed = output<void>();

  // ── Template References ────────────────────────────────────
  readonly dialogContainer = viewChild<ElementRef<HTMLElement>>('dialogContainer');

  // ── Internal State ─────────────────────────────────────────
  readonly failedImageIds = signal<Set<number>>(new Set());
  private triggerElement: HTMLElement | null = null;
  private previousBodyOverflow: string | null = null;

  // ── Computeds ──────────────────────────────────────────────
  readonly totalImages = computed(() => this.images().length);

  readonly currentImage = computed<HotelImageDto | null>(() => {
    const list = this.images();
    if (list.length === 0) return null;
    const idx = this.activeIndex();
    if (idx < 0 || idx >= list.length) {
      return list[0];
    }
    return list[idx];
  });

  constructor() {
    // Synchronize body scroll locking and trigger element focus restoration
    effect(() => {
      const isVisible = this.visible();
      if (typeof document === 'undefined') return;

      if (isVisible) {
        // Save currently focused element to restore on close
        this.triggerElement = (document.activeElement as HTMLElement) || null;
        this.previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Set initial focus to container or close button for accessibility
        setTimeout(() => {
          const container = this.dialogContainer()?.nativeElement;
          if (container) {
            const firstFocusable = container.querySelector<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            firstFocusable?.focus();
          }
        }, 50);
      } else {
        // Restore body scroll
        if (this.previousBodyOverflow !== null) {
          document.body.style.overflow = this.previousBodyOverflow;
          this.previousBodyOverflow = null;
        }

        // Restore focus to opener element
        if (this.triggerElement && typeof this.triggerElement.focus === 'function') {
          this.triggerElement.focus();
          this.triggerElement = null;
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined' && this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
    }
  }

  // ── Navigation Methods ─────────────────────────────────────
  next(): void {
    const total = this.totalImages();
    if (total <= 1) return;
    this.activeIndex.update((curr) => (curr + 1) % total);
  }

  prev(): void {
    const total = this.totalImages();
    if (total <= 1) return;
    this.activeIndex.update((curr) => (curr - 1 + total) % total);
  }

  goToIndex(index: number): void {
    if (index >= 0 && index < this.totalImages()) {
      this.activeIndex.set(index);
    }
  }

  closeLightbox(): void {
    this.visible.set(false);
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    // Only close if the backdrop itself was clicked (not children)
    if (event.target === event.currentTarget) {
      this.closeLightbox();
    }
  }

  // ── Image Error Fallback ───────────────────────────────────
  onImageError(imageId: number, event: Event): void {
    const imgEl = event.target as HTMLImageElement;
    if (imgEl && imgEl.src !== DEFAULT_IMAGE_PLACEHOLDER) {
      imgEl.src = DEFAULT_IMAGE_PLACEHOLDER;
    }
    this.failedImageIds.update((set) => {
      const next = new Set(set);
      next.add(imageId);
      return next;
    });
  }

  // ── Keyboard Navigation & Focus Trapping ───────────────────
  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (!this.visible()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeLightbox();
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'Right') {
      event.preventDefault();
      this.next();
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'Left') {
      event.preventDefault();
      this.prev();
      return;
    }

    // Focus Trapping for Tab navigation
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  private trapFocus(event: KeyboardEvent): void {
    const container = this.dialogContainer()?.nativeElement;
    if (!container) return;

    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
}
