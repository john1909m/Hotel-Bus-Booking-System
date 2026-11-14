import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { HotelService } from '../../../core/services/hotel.service';
import { HotelDTO } from '../../../core/models/Hotel/hotel.model';
import { PageHotelDTO,  HotelListParams } from '../../../core/models/Pagination/hotelPage.model';
import { SafeImageUrlPipe, DEFAULT_IMAGE_PLACEHOLDER } from '../../../core/utils/safe-image-url';

type PageState = 'loading' | 'success' | 'empty' | 'error';

@Component({
  selector: 'app-hotel-listing',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    RouterLink,
    SafeImageUrlPipe,
    ButtonModule,
    TagModule,
    SkeletonModule,
  ],
  templateUrl: './hotel-listing.html',
  styleUrl: './hotel-listing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelListing implements OnInit, OnDestroy {
  readonly defaultPlaceholder = DEFAULT_IMAGE_PLACEHOLDER;
  private readonly hotelService = inject(HotelService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  // ── State signals ──────────────────────────────────────────
  readonly hotels = signal<HotelDTO[]>([]);
  readonly pageData = signal<PageHotelDTO | null>(null);
  readonly pageState = signal<PageState>('loading');
  readonly errorMessage = signal<string>('');

  // ── Filter signals ─────────────────────────────────────────
  readonly searchQuery = signal<string>('');
  readonly cityFilter = signal<string>('');
  readonly minRatingFilter = signal<number | null>(null);
  readonly sortFilter = signal<string>('');
  readonly currentPage = signal<number>(0); // API is 0-based (Spring Data default)
  readonly pageSize = 12;

  // ── Dynamic cities from actual hotel data ──────────────────
  readonly availableCities = signal<string[]>([]);

  readonly cityOptions = computed(() => [
    { label: 'All Cities', value: '' },
    ...this.availableCities().map((c) => ({ label: c, value: c })),
  ]);

  readonly ratingOptions = [
    { label: 'All Ratings', value: '' },
    { label: '4.5★ & above', value: '4.5' },
    { label: '4.0★ & above', value: '4' },
    { label: '3.5★ & above', value: '3.5' },
    { label: '3.0★ & above', value: '3' },
  ];

  readonly sortOptions = [
    { label: 'Default Sorting', value: '' },
    { label: 'Highest Rated', value: 'rating,desc' },
    { label: 'Name: A–Z', value: 'name,asc' },
    { label: 'Name: Z–A', value: 'name,desc' },
  ];

  // ── Computed ───────────────────────────────────────────────
  readonly totalPages = computed(() => this.pageData()?.totalPages ?? 0);
  readonly totalElements = computed(() => this.pageData()?.totalElements ?? 0);
  readonly isFirstPage = computed(() => this.pageData()?.first ?? true);
  readonly isLastPage = computed(() => this.pageData()?.last ?? true);
  readonly hasActiveFilters = computed(
    () => !!(this.searchQuery() || this.cityFilter() || this.minRatingFilter() !== null || this.sortFilter())
  );
  readonly displayedFrom = computed(() => {
    const p = this.pageData();
    if (!p || p.empty || p.totalElements === 0) return 0;
    const pageNum = p.pageable?.pageNumber ?? p.number ?? this.currentPage();
    return pageNum * p.size + 1;
  });
  readonly displayedTo = computed(() => {
    const p = this.pageData();
    if (!p || p.empty || p.totalElements === 0) return 0;
    const pageNum = p.pageable?.pageNumber ?? p.number ?? this.currentPage();
    return Math.min(pageNum * p.size + (p.numberOfElements ?? p.content?.length ?? 0), p.totalElements);
  });
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    if (total <= 1) return [];
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(0, current - 2);
    const end = Math.min(total - 1, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  ngOnInit(): void {
    // Debounce search input to avoid excess API calls while updating as user types
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(0);
        this.loadHotels();
      });

    this.loadHotels();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data loading ───────────────────────────────────────────
  loadHotels(): void {
    this.pageState.set('loading');

    const params: HotelListParams = {
      page: this.currentPage(),
      size: this.pageSize,
    };

    const q = this.searchQuery().trim();
    if (q) params.q = q;

    const city = this.cityFilter().trim();
    if (city) params.city = city;

    const minRating = this.minRatingFilter();
    if (minRating !== null && minRating !== undefined) params.minRating = minRating;

    const sort = this.sortFilter();
    if (sort) params.sort = sort;

    this.hotelService
      .getHotels(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.pageData.set(response);
          this.hotels.set(response.content ?? []);
          this.pageState.set(response.empty ? 'empty' : 'success');

          // Dynamically populate available cities from actual hotel data
          if (response.content && response.content.length > 0) {
            this.collectCities(response.content);
          }

          // Fetch complete city catalog if more hotels exist and not already filtered
          if (
            response.totalElements > this.pageSize &&
            !this.searchQuery() &&
            !this.cityFilter() &&
            this.currentPage() === 0
          ) {
            this.loadAllCities(response.totalElements);
          }
        },
        error: (err) => {
          this.errorMessage.set(err?.message ?? 'Failed to load hotels. Please try again.');
          this.pageState.set('error');
        },
      });
  }

  private collectCities(hotels: HotelDTO[]): void {
    const set = new Set(this.availableCities());
    for (const h of hotels) {
      if (h.city && typeof h.city === 'string' && h.city.trim().length > 0) {
        set.add(h.city.trim());
      }
    }
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    this.availableCities.set(sorted);
  }

  private loadAllCities(total: number): void {
    this.hotelService
      .getHotels({ page: 0, size: Math.min(total, 100) })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (allData) => {
          if (allData?.content) {
            this.collectCities(allData.content);
          }
        },
        error: () => {
          // Fallback gracefully to current page cities
        },
      });
  }

  // ── Filter handlers ────────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject$.next(value);
  }

  clearSearchInput(): void {
    this.searchQuery.set('');
    this.currentPage.set(0);
    this.loadHotels();
  }

  onCityChange(value: string): void {
    this.cityFilter.set(value);
    this.currentPage.set(0);
    this.loadHotels();
  }

  onRatingChange(value: string): void {
    const parsed = value ? parseFloat(value) : null;
    this.minRatingFilter.set(parsed);
    this.currentPage.set(0);
    this.loadHotels();
  }

  onSortChange(value: string): void {
    this.sortFilter.set(value);
    this.currentPage.set(0);
    this.loadHotels();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.cityFilter.set('');
    this.minRatingFilter.set(null);
    this.sortFilter.set('');
    this.currentPage.set(0);
    this.loadHotels();
  }

  // ── Pagination ─────────────────────────────────────────────
  goToPage(page: number): void {
    const total = this.totalPages();
    if (page < 0 || page >= total) return;
    if (page === this.currentPage()) return;
    this.currentPage.set(page);
    this.loadHotels();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  // ── Location & Maps ───────────────────────────────────────
  hasValidCoordinates(hotel: HotelDTO): boolean {
    const lat = hotel.latitude;
    const lng = hotel.longitude;
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  getGoogleMapsUrl(hotel: HotelDTO): string {
    if (!this.hasValidCoordinates(hotel)) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.latitude)},${encodeURIComponent(hotel.longitude)}`;
  }

  // ── Helpers ────────────────────────────────────────────────
  trackByHotelId(_index: number, hotel: HotelDTO): number {
    return hotel.id;
  }

  getStarArray(rating: number): number[] {
    const full = Math.round(Math.max(0, Math.min(5, rating)));
    return Array.from({ length: 5 }, (_, i) => i < full ? 1 : 0);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.includes('hotel-placeholder.svg')) {
      img.src = this.defaultPlaceholder;
    }
  }
}
