import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { PrimeNG } from 'primeng/config';

export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export const LANGUAGE_STORAGE_KEY = 'te-lang';

export const PRIMENG_EN = {
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  today: 'Today',
  clear: 'Clear',
  dateFormat: 'mm/dd/yy',
  firstDayOfWeek: 0,
  emptyMessage: 'No results found',
  selectionMessage: '{0} items selected',
  chooseYear: 'Choose Year',
  chooseMonth: 'Choose Month',
  chooseDate: 'Choose Date',
  prevMonth: 'Previous Month',
  nextMonth: 'Next Month',
  prevYear: 'Previous Year',
  nextYear: 'Next Year',
};

export const PRIMENG_AR = {
  dayNames: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  dayNamesShort: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
  dayNamesMin: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'],
  monthNames: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  monthNamesShort: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  today: 'اليوم',
  clear: 'مسح',
  dateFormat: 'yy/mm/dd',
  firstDayOfWeek: 6,
  emptyMessage: 'لا توجد نتائج',
  selectionMessage: 'تم تحديد {0} عناصر',
  chooseYear: 'اختر السنة',
  chooseMonth: 'اختر الشهر',
  chooseDate: 'اختر التاريخ',
  prevMonth: 'الشهر السابق',
  nextMonth: 'الشهر القادم',
  prevYear: 'السنة السابقة',
  nextYear: 'السنة القادمة',
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly translate = inject(TranslateService);
  private readonly primeng = inject(PrimeNG);

  readonly currentLanguage = signal<Language>(this.resolveInitialLanguage());
  readonly currentDirection = computed<Direction>(() => (this.currentLanguage() === 'ar' ? 'rtl' : 'ltr'));
  readonly isRtl = computed<boolean>(() => this.currentLanguage() === 'ar');

  constructor() {
    this.translate.addLangs(['en', 'ar']);
    this.translate.setFallbackLang('en');

    // Initialize immediately
    const initialLang = this.currentLanguage();
    this.applyLanguage(initialLang);
  }

  setLanguage(lang: Language): void {
    if ((lang === 'en' || lang === 'ar') && this.currentLanguage() !== lang) {
      this.currentLanguage.set(lang);
      this.applyLanguage(lang);
    }
  }

  toggleLanguage(): void {
    const nextLang = this.currentLanguage() === 'en' ? 'ar' : 'en';
    this.setLanguage(nextLang);
  }

  private applyLanguage(lang: Language): void {
    this.translate.use(lang);
    this.primeng.setTranslation(lang === 'ar' ? PRIMENG_AR : PRIMENG_EN);

    if (this.isBrowser) {
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      } catch {
        // Handle storage quota / restricted environments
      }
    }
  }

  private resolveInitialLanguage(): Language {
    if (!this.isBrowser) return 'en';
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
      if (saved === 'en' || saved === 'ar') return saved;
    } catch {
      // Ignore storage access errors
    }
    return 'en';
  }
}
