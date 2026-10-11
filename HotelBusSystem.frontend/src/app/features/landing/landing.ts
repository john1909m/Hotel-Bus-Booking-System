import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  readonly today = new Date().toISOString().split('T')[0];

  searchForm: FormGroup = this.fb.group({
    destination: [''],
    checkIn:      [''],
    checkOut:     [''],
    guests:       [2],
  });

  readonly guestOptions = [
    { value: 1, label: '1 Adult'  },
    { value: 2, label: '2 Adults' },
    { value: 3, label: '3 Adults' },
    { value: 4, label: '4 Adults' },
    { value: 5, label: '5 Adults' },
    { value: 6, label: '6+ Adults'},
  ];

  readonly trustItems: { icon: SafeHtml; title: string; desc: string }[] = [
    {
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>`),
      title: 'Carefully Selected Stays',
      desc:  'Quality hotels for every journey.',
    },
    {
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/>
          <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>`),
      title: 'Convenient Travel Planning',
      desc:  'Hotels and buses, all in one place.',
    },
    {
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>`),
      title: 'Transparent Information',
      desc:  'Clear details, no hidden costs.',
    },
    {
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 14a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.92 18z"/>
        </svg>`),
      title: 'Reliable Support',
      desc:  "We're here when you need us.",
    },
  ];

  readonly destinations = [
    {
      name:    'Cairo',
      tagline: 'Rich history, timeless beauty',
      image:   'assets/images/cairo.jpg',
    },
    {
      name:    'Sharm El Sheikh',
      tagline: 'Crystal waters, endless adventure',
      image:   'assets/images/sharm.jpg',
    },
    {
      name:    'Alexandria',
      tagline: 'Mediterranean charm, classic vibe',
      image:   'assets/images/alexandria.jpg',
    },
    {
      name:    'Hurghada',
      tagline: 'Sun, sea and pure relaxation',
      image:   'assets/images/hurghada.jpg',
    },
  ];

  onSearch(): void {
    // UI prototype — no API connection at this stage
    console.log('Search submitted (UI prototype):', this.searchForm.value);
  }

  smoothScroll(event: Event, id: string): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
