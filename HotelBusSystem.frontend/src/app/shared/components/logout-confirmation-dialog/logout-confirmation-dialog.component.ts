import {
  Component,
  ChangeDetectionStrategy,
  model,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-logout-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule],
  templateUrl: './logout-confirmation-dialog.component.html',
  styleUrl: './logout-confirmation-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoutConfirmationDialogComponent {
  readonly visible = model<boolean>(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private wasConfirmed = false;

  onConfirm(): void {
    this.wasConfirmed = true;
    this.visible.set(false);
    this.confirmed.emit();
  }

  onCancel(): void {
    this.wasConfirmed = false;
    this.visible.set(false);
    this.cancelled.emit();
  }

  onHide(): void {
    if (!this.wasConfirmed) {
      this.cancelled.emit();
    }
    this.wasConfirmed = false;
  }
}

