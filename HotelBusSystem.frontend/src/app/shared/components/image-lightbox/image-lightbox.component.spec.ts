import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Injector,
  runInInjectionContext,
  signal,
  ɵChangeDetectionScheduler as ChangeDetectionScheduler,
  ɵEffectScheduler as EffectScheduler,
} from '@angular/core';
import { ImageLightboxComponent } from './image-lightbox.component';
import { HotelImageDto } from '../../../core/models/Image/hotel_image.model';

describe('ImageLightboxComponent (Standalone)', () => {
  let component: ImageLightboxComponent;
  let imagesSignal = signal<HotelImageDto[]>([]);

  const mockImages: HotelImageDto[] = [
    { id: 1, hotelId: 10, roomType: null, url: 'https://pub-9188aaa3f1d74a5ca857aecc65c7c25f.r2.dev/photo1.jpg', sortOrder: 0 },
    { id: 2, hotelId: 10, roomType: 'DOUBLE', url: 'https://pub-9188aaa3f1d74a5ca857aecc65c7c25f.r2.dev/photo2.jpg', sortOrder: 1 },
    { id: 3, hotelId: 10, roomType: null, url: 'https://pub-9188aaa3f1d74a5ca857aecc65c7c25f.r2.dev/photo3.jpg', sortOrder: 2 },
  ];

  beforeEach(() => {
    imagesSignal = signal<HotelImageDto[]>(mockImages);
    const injector = Injector.create({
      providers: [
        { provide: ChangeDetectionScheduler, useValue: { notify: () => {} } },
        {
          provide: EffectScheduler,
          useValue: {
            add: (node: any) => { node.run?.(); },
            schedule: (fn?: any) => { if (typeof fn === 'function') fn(); },
          },
        },
      ],
    });
    component = runInInjectionContext(injector, () => new ImageLightboxComponent());

    // Connect images input signal for isolated unit testing
    Object.defineProperty(component, 'images', {
      value: imagesSignal,
      writable: true,
      configurable: true,
    });

    component.activeIndex.set(0);
    component.visible.set(false);
  });

  afterEach(() => {
    component?.ngOnDestroy();
  });

  it('should initialize with correct total count and active image', () => {
    expect(component.totalImages()).toBe(3);
    expect(component.currentImage()?.id).toBe(1);
  });

  it('should cycle forward with next() and wrap around', () => {
    component.activeIndex.set(0);
    component.next();
    expect(component.activeIndex()).toBe(1);

    component.next();
    expect(component.activeIndex()).toBe(2);

    // Wrap around
    component.next();
    expect(component.activeIndex()).toBe(0);
  });

  it('should cycle backward with prev() and wrap around', () => {
    component.activeIndex.set(0);
    component.prev();
    expect(component.activeIndex()).toBe(2);

    component.prev();
    expect(component.activeIndex()).toBe(1);
  });

  it('should go to specific valid index with goToIndex() and ignore invalid index', () => {
    component.goToIndex(2);
    expect(component.activeIndex()).toBe(2);

    component.goToIndex(99);
    expect(component.activeIndex()).toBe(2);

    component.goToIndex(-1);
    expect(component.activeIndex()).toBe(2);
  });

  it('should close lightbox and emit closed event', () => {
    let closedEmitted = false;
    component.closed.subscribe(() => {
      closedEmitted = true;
    });

    component.visible.set(true);
    component.closeLightbox();

    expect(component.visible()).toBe(false);
    expect(closedEmitted).toBe(true);
  });

  it('should close on backdrop click, but not on content click', () => {
    component.visible.set(true);

    const backdropTarget = {} as HTMLElement;
    const backdropEvent = { target: backdropTarget, currentTarget: backdropTarget } as unknown as MouseEvent;
    component.onBackdropClick(backdropEvent);
    expect(component.visible()).toBe(false);

    // Click on inner element should not close
    component.visible.set(true);
    const innerTarget = {} as HTMLElement;
    const childEvent = { target: innerTarget, currentTarget: backdropTarget } as unknown as MouseEvent;
    component.onBackdropClick(childEvent);
    expect(component.visible()).toBe(true);
  });

  it('should handle keyboard navigation (ArrowRight, ArrowLeft, Escape) when visible', () => {
    component.visible.set(true);
    component.activeIndex.set(0);

    // ArrowRight
    component.handleKeyboard({ key: 'ArrowRight', preventDefault: vi.fn() } as unknown as KeyboardEvent);
    expect(component.activeIndex()).toBe(1);

    // ArrowLeft
    component.handleKeyboard({ key: 'ArrowLeft', preventDefault: vi.fn() } as unknown as KeyboardEvent);
    expect(component.activeIndex()).toBe(0);

    // Escape
    component.handleKeyboard({ key: 'Escape', preventDefault: vi.fn() } as unknown as KeyboardEvent);
    expect(component.visible()).toBe(false);
  });

  it('should ignore keyboard navigation when visible is false', () => {
    component.visible.set(false);
    component.activeIndex.set(0);

    component.handleKeyboard({ key: 'ArrowRight', preventDefault: vi.fn() } as unknown as KeyboardEvent);
    expect(component.activeIndex()).toBe(0);
  });

  it('should handle empty image list safely', () => {
    imagesSignal.set([]);
    expect(component.totalImages()).toBe(0);
    expect(component.currentImage()).toBeNull();

    // Should not throw
    component.next();
    component.prev();
    expect(component.activeIndex()).toBe(0);
  });
});
