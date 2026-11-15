import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { LogoutConfirmationDialogComponent } from './logout-confirmation-dialog.component';

describe('LogoutConfirmationDialogComponent', () => {
  let component: LogoutConfirmationDialogComponent;
  let injector: Injector;

  beforeEach(() => {
    injector = Injector.create({
      providers: [LogoutConfirmationDialogComponent],
    });
    component = runInInjectionContext(injector, () => injector.get(LogoutConfirmationDialogComponent));
  });

  it('initializes with visible false', () => {
    expect(component.visible()).toBe(false);
  });

  it('emits confirmed event and closes dialog on onConfirm()', () => {
    const confirmSpy = vi.fn();
    component.confirmed.subscribe(confirmSpy);
    component.visible.set(true);

    component.onConfirm();

    expect(component.visible()).toBe(false);
    expect(confirmSpy).toHaveBeenCalled();
  });

  it('emits cancelled event and closes dialog on onCancel()', () => {
    const cancelSpy = vi.fn();
    component.cancelled.subscribe(cancelSpy);
    component.visible.set(true);

    component.onCancel();

    expect(component.visible()).toBe(false);
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('emits cancelled event on onHide() when dialog was not confirmed (Escape / X-icon)', () => {
    const cancelSpy = vi.fn();
    component.cancelled.subscribe(cancelSpy);
    component.visible.set(true);

    component.onHide();

    expect(cancelSpy).toHaveBeenCalled();
  });
});

