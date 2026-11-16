import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Injector, runInInjectionContext, PLATFORM_ID } from '@angular/core';
import { LanguageService, LANGUAGE_STORAGE_KEY, PRIMENG_AR, PRIMENG_EN } from './language.service';
import { TranslateService } from '@ngx-translate/core';
import { PrimeNG } from 'primeng/config';

describe('LanguageService', () => {
  let service: LanguageService;
  let mockTranslateService: any;
  let mockPrimeNG: any;
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    const storage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => { mockStorage[key] = val; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; },
    };
    vi.stubGlobal('localStorage', storage);

    // Mock document
    const attributes: Record<string, string> = {};
    const docElem = {
      setAttribute: (k: string, v: string) => { attributes[k] = v; },
      getAttribute: (k: string) => attributes[k] ?? null,
    };
    vi.stubGlobal('document', { documentElement: docElem });

    mockTranslateService = {
      addLangs: vi.fn(),
      setFallbackLang: vi.fn(),
      use: vi.fn(),
    };

    mockPrimeNG = {
      setTranslation: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: LanguageService, useClass: LanguageService },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: PrimeNG, useValue: mockPrimeNG },
      ],
    });

    service = runInInjectionContext(injector, () => injector.get(LanguageService));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should initialize with en by default', () => {
    expect(service.currentLanguage()).toBe('en');
    expect(service.currentDirection()).toBe('ltr');
    expect(service.isRtl()).toBe(false);
    expect(mockTranslateService.addLangs).toHaveBeenCalledWith(['en', 'ar']);
    expect(mockTranslateService.setFallbackLang).toHaveBeenCalledWith('en');
    expect(mockTranslateService.use).toHaveBeenCalledWith('en');
    expect(mockPrimeNG.setTranslation).toHaveBeenCalledWith(PRIMENG_EN);
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('should switch to Arabic when setLanguage("ar") is called', () => {
    service.setLanguage('ar');

    expect(service.currentLanguage()).toBe('ar');
    expect(service.currentDirection()).toBe('rtl');
    expect(service.isRtl()).toBe(true);
    expect(mockTranslateService.use).toHaveBeenCalledWith('ar');
    expect(mockPrimeNG.setTranslation).toHaveBeenCalledWith(PRIMENG_AR);
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar');
  });

  it('should toggle between en and ar when toggleLanguage() is called', () => {
    expect(service.currentLanguage()).toBe('en');

    service.toggleLanguage();
    expect(service.currentLanguage()).toBe('ar');
    expect(service.isRtl()).toBe(true);

    service.toggleLanguage();
    expect(service.currentLanguage()).toBe('en');
    expect(service.isRtl()).toBe(false);
  });

  it('should resolve initial language from localStorage if present', () => {
    mockStorage[LANGUAGE_STORAGE_KEY] = 'ar';

    const injector = Injector.create({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: LanguageService, useClass: LanguageService },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: PrimeNG, useValue: mockPrimeNG },
      ],
    });

    const newService = runInInjectionContext(injector, () => injector.get(LanguageService));
    expect(newService.currentLanguage()).toBe('ar');
    expect(newService.currentDirection()).toBe('rtl');
    expect(newService.isRtl()).toBe(true);
  });
});
