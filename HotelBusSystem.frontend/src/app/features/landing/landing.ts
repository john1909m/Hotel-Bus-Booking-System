import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { finalize } from 'rxjs';

import { BusStopService } from '../../core/services/bus-stop.service';
import { BusStopDto } from '../../core/models/Bus/bus-stop.model';

function differentCitiesValidator(group: AbstractControl): ValidationErrors | null {
  const origin = group.get('originCity')?.value?.trim().toLowerCase();
  const dest = group.get('destinationCity')?.value?.trim().toLowerCase();
  if (origin && dest && origin === dest) {
    return { sameCity: true };
  }
  return null;
}

function notPastDateValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const todayStr = new Date().toISOString().split('T')[0];
  if (control.value < todayStr) {
    return { pastDate: true };
  }
  return null;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly busStopService = inject(BusStopService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly today = new Date().toISOString().split('T')[0];

  // Component Signals
  readonly loadingStops = signal<boolean>(false);
  readonly stopsError = signal<string | null>(null);
  readonly stops = signal<BusStopDto[]>([]);
  readonly cities = signal<string[]>([]);

  // Bus Search Form
  readonly searchForm: FormGroup = this.fb.group(
    {
      originCity: ['', [Validators.required]],
      destinationCity: ['', [Validators.required]],
      departureDate: [this.today, [Validators.required, notPastDateValidator]],
    },
    { validators: differentCitiesValidator }
  );

  readonly trustItems: { icon: SafeHtml; title: string; desc: string }[] = [
    {
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>`),
      title: 'Carefully Selected Stays',
      desc: 'Quality hotels for every journey.',
    },
    {
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/>
          <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>`),
      title: 'Convenient Travel Planning',
      desc: 'Hotels and buses, all in one place.',
    },
    {
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>`),
      title: 'Transparent Information',
      desc: 'Clear details, no hidden costs.',
    },
    {
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 14a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.92 18z"/>
        </svg>`),
      title: 'Reliable Support',
      desc: "We're here when you need us.",
    },
  ];

  readonly destinations = [
    {
      name: 'Cairo',
      tagline: 'Rich history, timeless beauty',
      image: 'assets/images/cairo.jpg',
    },
    {
      name: 'Sharm El Sheikh',
      tagline: 'Crystal waters, endless adventure',
      image: 'assets/images/sharm.jpg',
    },
    {
      name: 'Alexandria',
      tagline: 'Mediterranean charm, classic vibe',
      image: 'assets/images/alexandria.jpg',
    },
    {
      name: 'Hurghada',
      tagline: 'Sun, sea and pure relaxation',
      image: 'assets/images/hurghada.jpg',
    },
  ];

  ngOnInit(): void {
    this.loadBusStops();

    // Read query params if redirected from search results (Modify Search flow)
    this.route.queryParams.subscribe((params) => {
      const orig = params['origin']?.trim();
      const dest = params['destination']?.trim();
      const depDate = params['departureDate']?.trim();

      if (orig || dest || depDate) {
        this.searchForm.patchValue({
          ...(orig ? { originCity: orig } : {}),
          ...(dest ? { destinationCity: dest } : {}),
          ...(depDate ? { departureDate: depDate } : {}),
        });

        // Smooth scroll to the search form
        setTimeout(() => {
          document.getElementById('transportation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    });
  }

  /**
   * Load all bus stops to dynamically populate unique cities without hardcoding.
   */
  loadBusStops(): void {
    this.loadingStops.set(true);
    this.stopsError.set(null);

    this.busStopService.getAllBusStops({ size: 100 }).pipe(
      finalize(() => this.loadingStops.set(false))
    ).subscribe({
      next: (response) => {
        const stopList = response?.content || [];
        this.stops.set(stopList);

        // Deduplicate cities across all stops and sort alphabetically
        const uniqueCities = Array.from(
          new Set(
            stopList
              .map((s) => s.city?.trim())
              .filter((c): c is string => Boolean(c && c.length > 0))
          )
        ).sort((a, b) => a.localeCompare(b));

        this.cities.set(uniqueCities);
      },
      error: (err) => {
        console.error('Error loading bus stops:', err);
        this.stopsError.set('Unable to load available cities. Please refresh or try again.');
      },
    });
  }

  /**
   * Swaps origin and destination cities in the search form.
   */
  swapCities(): void {
    const origin = this.searchForm.get('originCity')?.value;
    const dest = this.searchForm.get('destinationCity')?.value;

    this.searchForm.patchValue({
      originCity: dest,
      destinationCity: origin,
    });

    this.searchForm.get('originCity')?.markAsTouched();
    this.searchForm.get('destinationCity')?.markAsTouched();
  }

  /**
   * Validates form and navigates to the dedicated Bus Search Results route
   * passing criteria through Angular Router query parameters.
   */
  onSearch(): void {
    this.searchForm.markAllAsTouched();

    if (this.searchForm.invalid) {
      return;
    }

    const { originCity, destinationCity, departureDate } = this.searchForm.value;

    this.router.navigate(['/buses/results'], {
      queryParams: {
        origin: originCity,
        destination: destinationCity,
        departureDate: departureDate,
      },
    });
  }

  smoothScroll(event: Event, id: string): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
