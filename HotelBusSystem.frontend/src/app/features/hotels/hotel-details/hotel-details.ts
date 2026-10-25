import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { HotelService } from '../../../core/services/hotel.service';
import { RoomService } from '../../../core/services/room.service';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { HotelImageService } from '../../../core/services/hotel-image.service';
import { AuthService } from '../../../core/services/auth.service';
import { HotelDTO } from '../../../core/models/Hotel/hotel.model';
import { RoomDTO, roomType } from '../../../core/models/Room/room.model';
import { HotelImageDto } from '../../../core/models/Image/hotel_image.model';
import { PagedModelRoomDto } from '../../../core/models/Pagination/roomPage.model';
import { HotelBookingDTO, HotelBookingRequestDTO } from '../../../core/models/Hotel/hotel-booking.model';
import { HotelBookingSummaryComponent } from './hotel-booking-summary/hotel-booking-summary.component';
import { SafeImageUrlPipe, DEFAULT_IMAGE_PLACEHOLDER } from '../../../../utils/safe-image-url';

import { ImageLightboxComponent } from '../../../shared/components/image-lightbox/image-lightbox.component';

export interface ChildGuest {
  id: number;
  age: number | null;
}

export interface HotelBookingDraft {
  hotelId: number;
  selectedRoomIds: number[];
  checkIn: string;
  checkOut: string;
  adultsCount: number;
  children: ChildGuest[];
  customRoomAdults: Record<number, number>;
  customRoomChildIds: Record<number, number[]>;
  timestamp: number;
}

type LoadState = 'loading' | 'success' | 'empty' | 'error';
type CapacityValidationStatus = 'no-rooms' | 'missing-age' | 'exceeded' | 'valid';

@Component({
  selector: 'app-hotel-details',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    RouterLink,
    FormsModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    MessageModule,
    DialogModule,
    ProgressSpinnerModule,
    HotelBookingSummaryComponent,
    SafeImageUrlPipe,
    ImageLightboxComponent,
  ],
  templateUrl: './hotel-details.html',
  styleUrl: './hotel-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelDetails implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hotelService = inject(HotelService);
  private readonly roomService = inject(RoomService);
  private readonly hotelImageService = inject(HotelImageService);
  readonly hotelBookingService = inject(HotelBookingService);
  readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  // ── Hotel State ─────────────────────────────────────────────
  readonly hotelId = signal<number | null>(null);
  readonly hotel = signal<HotelDTO | null>(null);
  readonly hotelState = signal<LoadState>('loading');
  readonly hotelError = signal<string>('');

  // ── Gallery State & Filtering ───────────────────────────────
  // Single source of truth loaded once without roomType filter
  readonly allHotelImages = signal<HotelImageDto[]>([]);
  // Active filter chip: 'GENERAL' (default, roomType === null) | 'ALL' | distinct room types
  readonly galleryFilter = signal<string>('GENERAL');
  readonly galleryState = signal<LoadState>('loading');
  readonly galleryError = signal<string>('');
  readonly activeImageIndex = signal<number>(0);
  readonly failedImageIds = signal<Set<number>>(new Set());

  // Distinct room types dynamically extracted from the actual fetched images
  readonly distinctImageRoomTypes = computed(() => {
    const list = this.allHotelImages();
    const set = new Set<string>();
    for (const img of list) {
      if (img.roomType) {
        set.add(img.roomType.trim().toUpperCase());
      }
    }
    return Array.from(set).sort();
  });

  // Filtered images operating entirely locally on the already-fetched array
  readonly filteredGalleryImages = computed(() => {
    const all = [...this.allHotelImages()];
    // Sort consistently with API sortOrder, then ID
    all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);

    const filter = this.galleryFilter().trim().toUpperCase();
    if (filter === 'ALL') {
      return all;
    }
    if (filter === 'GENERAL') {
      return all.filter((img) => !img.roomType);
    }
    return all.filter((img) => img.roomType?.trim().toUpperCase() === filter);
  });

  // Exposed alias for gallery images
  readonly galleryImages = this.filteredGalleryImages;
  readonly totalGalleryImages = computed(() => this.filteredGalleryImages().length);

  readonly activeImage = computed<HotelImageDto | null>(() => {
    const list = this.filteredGalleryImages();
    if (list.length === 0) return null;
    const idx = this.activeImageIndex();
    if (idx < 0 || idx >= list.length) {
      return list[0];
    }
    return list[idx];
  });

  // ── Lightbox State ──────────────────────────────────────────
  readonly lightboxVisible = signal<boolean>(false);
  readonly lightboxIndex = signal<number>(0);
  readonly currentLightboxImage = computed<HotelImageDto | null>(() => {
    const list = this.filteredGalleryImages();
    const idx = this.lightboxIndex();
    return idx >= 0 && idx < list.length ? list[idx] : null;
  });

  // ── Edit Existing Booking State ─────────────────────────────
  readonly editingBookingId = signal<number | null>(null);
  readonly editingBooking = signal<HotelBookingDTO | null>(null);
  readonly isEditMode = computed<boolean>(() => this.editingBookingId() !== null);
  readonly updateSuccessNotice = signal<string | null>(null);

  // ── Booking Summary Sidebar State ───────────────────────────
  readonly sidebarVisible = signal<boolean>(false);

  // ── Stay Dates State ─────────────────────────────────────────
  readonly checkInInput = signal<string>('');
  readonly checkOutInput = signal<string>('');
  readonly minCheckInDate = signal<string>(this.getTodayString());

  // Unified Parsed Stay Dates computation
  readonly parsedDates = computed(() => {
    const inStr = this.checkInInput();
    const outStr = this.checkOutInput();
    const dIn = this.parseLocalDate(inStr);
    const dOut = this.parseLocalDate(outStr);
    const today = this.parseLocalDate(this.getTodayString());
    const isValid = !!(dIn && dOut && today && dIn >= today && dOut > dIn);
    const nights =
      dIn && dOut && dOut > dIn
        ? Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24))
        : null;
    return { inStr, outStr, dIn, dOut, today, isValid, nights };
  });

  readonly areStayDatesValid = computed<boolean>(() => this.parsedDates().isValid);
  readonly hasStayDates = this.areStayDatesValid;
  readonly stayNights = computed<number | null>(() => this.parsedDates().nights);

  readonly minCheckOutDate = computed<string>(() => {
    const dIn = this.parsedDates().dIn;
    if (dIn) {
      const next = new Date(dIn);
      next.setDate(next.getDate() + 1);
      return this.formatDateToIso(next);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.formatDateToIso(tomorrow);
  });

  readonly formattedCheckIn = computed<string | null>(() => {
    const d = this.parsedDates().dIn;
    return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
  });

  readonly formattedCheckOut = computed<string | null>(() => {
    const d = this.parsedDates().dOut;
    return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
  });

  // ── Rooms State ─────────────────────────────────────────────
  readonly rooms = signal<RoomDTO[]>([]);
  readonly roomsPageData = signal<PagedModelRoomDto | null>(null);
  readonly roomsState = signal<LoadState>('loading');
  readonly roomsError = signal<string>('');

  // ── Rooms Pagination & Filter ───────────────────────────────
  readonly currentRoomsPage = signal<number>(0);
  readonly roomsPageSize = signal<number>(12);
  readonly selectedRoomType = signal<string>('ALL');
  readonly sortBy = signal<string>('default');

  // ── Multi-Room Selection State ──────────────────────────────
  readonly selectedRooms = signal<RoomDTO[]>([]);
  readonly selectedRoomIdSet = computed(() => new Set(this.selectedRooms().map((r) => r.id)));
  readonly selectedRoomsCount = computed(() => this.selectedRooms().length);

  // ── Guest Selection State ───────────────────────────────────
  readonly adultsCount = signal<number>(2);
  readonly children = signal<ChildGuest[]>([]);
  private nextChildId = 1;
  readonly availableChildAges: readonly number[] = Array.from({ length: 18 }, (_, i) => i);

  // ── Per-Room Guest Assignment State ─────────────────────────
  readonly customRoomAdults = signal<Record<number, number>>({});
  readonly customRoomChildIds = signal<Record<number, number[]>>({});

  // ── Guest & Capacity Computeds ──────────────────────────────
  readonly totalChildrenCount = computed(() => this.children().length);
  readonly totalGuestsCount = computed(() => this.adultsCount() + this.totalChildrenCount());

  readonly freeChildrenCount = computed(() =>
    this.children().filter((c) => c.age !== null && c.age >= 0 && c.age <= 11).length
  );

  readonly capacityChildrenCount = computed(() =>
    this.children().filter((c) => c.age !== null && c.age >= 12 && c.age <= 17).length
  );

  readonly requiredCapacity = computed(() =>
    this.adultsCount() + this.capacityChildrenCount()
  );

  readonly totalRoomCapacity = computed(() =>
    this.selectedRooms().reduce((sum, r) => sum + (r.capacity || 0), 0)
  );

  readonly remainingCapacity = computed(() =>
    this.totalRoomCapacity() - this.requiredCapacity()
  );

  readonly allChildAgesValid = computed(() => {
    const list = this.children();
    return list.every((c) => c.age !== null && c.age !== undefined && c.age >= 0 && c.age <= 17);
  });

  readonly capacityStatus = computed<CapacityValidationStatus>(() => {
    if (this.selectedRooms().length === 0) return 'no-rooms';
    if (!this.allChildAgesValid()) return 'missing-age';
    if (this.requiredCapacity() > this.totalRoomCapacity()) return 'exceeded';
    return 'valid';
  });

  // ── Google Maps Coordinate Validation & URL ─────────────────
  isValidCoordinate(lat: unknown, lng: unknown): boolean {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (isNaN(nLat) || isNaN(nLng) || !isFinite(nLat) || !isFinite(nLng)) return false;
    if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) return false;
    if (nLat === 0 && nLng === 0) return false; // Null Island check
    return true;
  }

  readonly hasValidCoordinates = computed(() => {
    const h = this.hotel();
    return h ? this.isValidCoordinate(h.latitude, h.longitude) : false;
  });

  readonly googleMapsUrl = computed(() => {
    const h = this.hotel();
    if (!h || !this.hasValidCoordinates()) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.latitude)},${encodeURIComponent(h.longitude)}`;
  });

  get currentUrl(): string {
    return this.router.url;
  }

  // ── Pricing Computeds ───────────────────────────────────────
  readonly totalNightlyRate = computed(() => {
    return this.selectedRooms().reduce((sum, r) => sum + (r.pricePerNight || 0), 0);
  });

  readonly totalStayCost = computed<number | null>(() => {
    const nights = this.stayNights();
    if (nights === null || nights <= 0) return null;
    return this.totalNightlyRate() * nights;
  });

  getRoomStayCost(room: RoomDTO): number | null {
    const nights = this.stayNights();
    if (nights === null || nights <= 0 || room.pricePerNight === undefined || room.pricePerNight === null) {
      return null;
    }
    return room.pricePerNight * nights;
  }

  // ── Other Computeds ─────────────────────────────────────────
  readonly starArray = computed(() => {
    const rating = Math.round(this.hotel()?.rating ?? 0);
    const valid = Math.max(0, Math.min(5, rating));
    return Array.from({ length: 5 }, (_, i) => (i < valid ? 1 : 0));
  });

  readonly filteredRooms = computed(() => {
    let list = [...this.rooms()];
    const typeFilter = this.selectedRoomType();

    if (typeFilter && typeFilter !== 'ALL') {
      list = list.filter((r) => r.roomType === typeFilter);
    }

    const sort = this.sortBy();
    if (sort === 'price-asc') {
      list.sort((a, b) => a.pricePerNight - b.pricePerNight);
    } else if (sort === 'price-desc') {
      list.sort((a, b) => b.pricePerNight - a.pricePerNight);
    } else if (sort === 'capacity-desc') {
      list.sort((a, b) => b.capacity - a.capacity);
    }

    return list;
  });

  readonly totalRoomsCount = computed(() => {
    return this.roomsPageData()?.page?.totalElements ?? this.rooms().length;
  });

  readonly totalRoomsPages = computed(() => {
    return this.roomsPageData()?.page?.totalPages ?? 1;
  });

  readonly isFirstPage = computed(() => this.currentRoomsPage() === 0);
  readonly isLastPage = computed(() => this.currentRoomsPage() >= this.totalRoomsPages() - 1);

  readonly pageNumbers = computed(() => {
    const total = this.totalRoomsPages();
    if (total <= 1) return [];
    const current = this.currentRoomsPage();
    const pages: number[] = [];
    const start = Math.max(0, current - 2);
    const end = Math.min(total - 1, current + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  readonly roomTypeCounts = computed(() => {
    const allRooms = this.rooms();
    const counts: Record<string, number> = { ALL: allRooms.length, SINGLE: 0, DOUBLE: 0, SUITE: 0, DELUXE: 0 };
    for (const r of allRooms) {
      if (counts[r.roomType] !== undefined) counts[r.roomType]++;
    }
    return counts;
  });

  // ── Booking Creation State & Validation ─────────────────────
  readonly isSubmittingBooking = signal<boolean>(false);
  readonly bookingErrorMessage = signal<string | null>(null);
  readonly bookingErrorStatus = signal<number | null>(null);
  readonly confirmedBooking = signal<HotelBookingDTO | null>(null);

  readonly bookingValidationErrors = computed<string[]>(() => {
    const errors: string[] = [];
    if (this.selectedRooms().length === 0) {
      errors.push('Select at least one room.');
    }

    const { inStr, outStr, dIn, dOut, today } = this.parsedDates();
    if (!inStr || !outStr) {
      errors.push('Select both check-in and check-out dates.');
    } else if (!dIn || !dOut) {
      errors.push('Please enter valid dates.');
    } else {
      if (today && dIn.getTime() < today.getTime()) {
        errors.push('Check-in date cannot be in the past.');
      }
      if (dOut.getTime() <= dIn.getTime()) {
        errors.push('Check-out date must be after check-in date.');
      }
    }

    if (this.selectedRooms().length > 0) {
      if (this.selectedRooms().some((r) => this.isRoomOverCapacity(r))) {
        errors.push('One or more selected rooms exceed maximum capacity.');
      }
      if (this.selectedRooms().some((r) => this.getAssignedAdults(r.id) < 1)) {
        errors.push('Each selected room must have at least one adult assigned.');
      }
    }

    if (!this.allChildAgesValid()) {
      errors.push('Specify ages for all accompanying children.');
    }

    return errors;
  });

  readonly canSubmitBooking = computed<boolean>(() => {
    return this.bookingValidationErrors().length === 0 && !this.isSubmittingBooking();
  });

  // ── Lifecycle ───────────────────────────────────────────────
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const idParam = params.get('id');
      const id = idParam ? parseInt(idParam, 10) : NaN;

      if (isNaN(id) || id <= 0) {
        this.hotelError.set('Invalid Hotel ID provided.');
        this.hotelState.set('error');
        this.roomsState.set('empty');
        this.galleryState.set('empty');
        this.allHotelImages.set([]);
        return;
      }

      if (this.hotelId() !== id) {
        this.clearSelectedRooms();
        this.allHotelImages.set([]);
        this.galleryFilter.set('GENERAL');
        this.activeImageIndex.set(0);
        this.lightboxVisible.set(false);
        this.failedImageIds.set(new Set());
      }

      this.hotelId.set(id);
      this.currentRoomsPage.set(0);

      const qMap = this.route.snapshot.queryParamMap;
      const editIdParam = qMap.get('editBookingId') || qMap.get('bookingId');
      if (editIdParam) {
        const bId = Number(editIdParam);
        if (!isNaN(bId) && bId > 0) {
          this.loadBookingForEditing(bId);
        } else {
          this.restoreDraftIfPresent(id);
        }
      } else {
        this.restoreDraftIfPresent(id);
      }

      // Check for stay dates in query parameters
      const inParam = qMap.get('checkIn') || qMap.get('checkInDate');
      const outParam = qMap.get('checkOut') || qMap.get('checkOutDate');
      if (inParam) this.checkInInput.set(inParam);
      if (outParam) this.checkOutInput.set(outParam);

      this.loadHotel(id);
      this.loadRooms(id);
      this.loadGalleryImages(id);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data Loading ───────────────────────────────────────────
  loadHotel(id: number): void {
    this.hotelState.set('loading');
    this.hotelError.set('');

    this.hotelService
      .getHotelById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (hotel) => {
          this.hotel.set(hotel);
          this.hotelState.set('success');
        },
        error: (err) => {
          this.hotelError.set(err?.message || 'We could not find the requested hotel or it has been removed.');
          this.hotelState.set('error');
        },
      });
  }

  loadRooms(id: number): void {
    this.roomsState.set('loading');
    this.roomsError.set('');

    this.roomService
      .getPaginatedRoomsByHotelId(id, {
        page: this.currentRoomsPage(),
        size: this.roomsPageSize(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.roomsPageData.set(response);
          const content = response?.content || [];
          this.rooms.set(content);
          this.roomsState.set(content.length === 0 ? 'empty' : 'success');
          this.reconcileDraftRooms(id, content);
        },
        error: (err) => {
          this.roomService
            .getRoomsByHotelId(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (unpaginated) => {
                const list = Array.isArray(unpaginated) ? unpaginated : [];
                this.rooms.set(list);
                this.roomsState.set(list.length === 0 ? 'empty' : 'success');
                this.reconcileDraftRooms(id, list);
              },
              error: () => {
                this.roomsError.set(err?.message || 'Failed to load rooms for this hotel. Please try again later.');
                this.roomsState.set('error');
              },
            });
        },
      });
  }

  /**
   * Loads all hotel images once without roomType filter, keeping them in a single source of truth.
   */
  loadGalleryImages(hotelId: number): void {
    this.galleryState.set('loading');
    this.galleryError.set('');

    this.hotelImageService
      .getImages(hotelId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (images) => {
          const list = images || [];
          this.allHotelImages.set(list);
          this.activeImageIndex.set(0);
          this.galleryState.set(list.length > 0 ? 'success' : 'empty');
        },
        error: (err) => {
          this.galleryError.set(err?.message || 'Failed to load hotel photos.');
          this.galleryState.set('error');
        },
      });
  }

  setGalleryFilter(filter: string): void {
    this.galleryFilter.set(filter.trim().toUpperCase());
    this.activeImageIndex.set(0);
  }

  retryGalleryLoad(): void {
    const id = this.hotelId();
    if (id) {
      this.loadGalleryImages(id);
    }
  }

  retryLoad(): void {
    const id = this.hotelId();
    if (id) {
      this.loadHotel(id);
      this.loadRooms(id);
      this.loadGalleryImages(id);
    }
  }

  // ── Gallery User Interactions ──────────────────────────────
  setActiveImage(index: number): void {
    if (index >= 0 && index < this.galleryImages().length) {
      this.activeImageIndex.set(index);
    }
  }

  openLightbox(index?: number): void {
    const list = this.galleryImages();
    if (list.length === 0) return;
    const targetIdx = index !== undefined ? index : this.activeImageIndex();
    this.lightboxIndex.set(Math.max(0, Math.min(targetIdx, list.length - 1)));
    this.lightboxVisible.set(true);
  }

  closeLightbox(): void {
    this.lightboxVisible.set(false);
  }

  nextLightboxImage(): void {
    const total = this.galleryImages().length;
    if (total <= 1) return;
    this.lightboxIndex.update((curr) => (curr + 1) % total);
  }

  prevLightboxImage(): void {
    const total = this.galleryImages().length;
    if (total <= 1) return;
    this.lightboxIndex.update((curr) => (curr - 1 + total) % total);
  }

  onImageError(imageId: number, event: Event): void {
    const imgEl = event.target as HTMLImageElement;
    if (imgEl) {
      imgEl.src = DEFAULT_IMAGE_PLACEHOLDER;
    }
    this.failedImageIds.update((set) => {
      const next = new Set(set);
      next.add(imageId);
      return next;
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.lightboxVisible()) return;

    if (event.key === 'ArrowRight' || event.key === 'Right') {
      event.preventDefault();
      this.nextLightboxImage();
    } else if (event.key === 'ArrowLeft' || event.key === 'Left') {
      event.preventDefault();
      this.prevLightboxImage();
    } else if (event.key === 'Escape') {
      this.closeLightbox();
    }
  }

  // ── Filters & Sorting ──────────────────────────────────────
  onRoomTypeFilterChange(type: string): void {
    this.selectedRoomType.set(type);
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortBy.set(select.value);
  }

  // ── Pagination ─────────────────────────────────────────────
  goToRoomsPage(page: number): void {
    const total = this.totalRoomsPages();
    if (page < 0 || page >= total || page === this.currentRoomsPage()) return;
    this.currentRoomsPage.set(page);
    const id = this.hotelId();
    if (id) {
      this.loadRooms(id);
      const roomsEl = document.getElementById('hotel-rooms-section');
      if (roomsEl) roomsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  previousRoomsPage(): void {
    this.goToRoomsPage(this.currentRoomsPage() - 1);
  }

  nextRoomsPage(): void {
    this.goToRoomsPage(this.currentRoomsPage() + 1);
  }

  // ── Helpers ────────────────────────────────────────────────
  trackByRoomId(_index: number, room: RoomDTO): number {
    return room.id;
  }

  getRoomTypeLabel(type: roomType | string): string {
    switch (type) {
      case 'SINGLE': return 'Single Room';
      case 'DOUBLE': return 'Double Room';
      case 'SUITE': return 'Executive Suite';
      case 'DELUXE': return 'Deluxe Room';
      default: return type || 'Standard Room';
    }
  }

  getRoomTypeBadgeClass(type: roomType | string): string {
    switch (type) {
      case 'SINGLE': return 'badge-single';
      case 'DOUBLE': return 'badge-double';
      case 'SUITE': return 'badge-suite';
      case 'DELUXE': return 'badge-deluxe';
      default: return 'badge-default';
    }
  }

  getRoomAmenities(type: roomType | string): string[] {
    switch (type) {
      case 'SUITE':
        return ['King Bed', 'Living Area', 'Balcony View', 'Ensuite Jacuzzi', 'High-speed Wi-Fi'];
      case 'DELUXE':
        return ['Queen Bed', 'City View', 'Air Conditioning', 'Coffee Station', 'Mini Bar'];
      case 'DOUBLE':
        return ['2 Double Beds', 'Private Bath', 'Flat-screen TV', 'Work Desk', 'Soundproofing'];
      case 'SINGLE':
      default:
        return ['1 Single Bed', 'Private Bath', 'Free Wi-Fi', 'Daily Housekeeping', 'Air Conditioning'];
    }
  }

  // ── Multi-Room Selection Actions ───────────────────────────
  isRoomSelected(roomId: number): boolean {
    return this.selectedRoomIdSet().has(roomId);
  }

  toggleRoomSelection(room: RoomDTO): void {
    if (!room) return;
    const currentHotelId = this.hotelId();
    if (currentHotelId !== null && room.hotelId !== currentHotelId) return;

    const current = this.selectedRooms();
    const isAlreadySelected = current.some((r) => r.id === room.id);

    if (isAlreadySelected) {
      this.deselectRoom(room.id);
    } else {
      this.selectedRooms.set([...current, room]);
      this.saveBookingDraft();
    }
  }

  deselectRoom(roomId: number): void {
    this.selectedRooms.set(this.selectedRooms().filter((r) => r.id !== roomId));
    this.customRoomAdults.update((map) => {
      const next = { ...map };
      delete next[roomId];
      return next;
    });
    this.customRoomChildIds.update((map) => {
      const next = { ...map };
      delete next[roomId];
      return next;
    });
    this.saveBookingDraft();
  }

  clearSelectedRooms(): void {
    this.selectedRooms.set([]);
    this.customRoomAdults.set({});
    this.customRoomChildIds.set({});
    this.clearBookingDraft();
  }

  // ── Guest Selection Actions ────────────────────────────────
  increaseAdults(): void {
    this.adultsCount.update((count) => count + 1);
    this.saveBookingDraft();
  }

  decreaseAdults(): void {
    this.adultsCount.update((count) => Math.max(1, count - 1));
    this.saveBookingDraft();
  }

  addChild(): void {
    this.children.update((list) => [...list, { id: this.nextChildId++, age: null }]);
    this.saveBookingDraft();
  }

  removeLastChild(): void {
    const list = this.children();
    if (list.length > 0) {
      this.removeChild(list[list.length - 1].id);
    }
  }

  removeChild(childId: number): void {
    this.children.update((list) => list.filter((c) => c.id !== childId));
    this.customRoomChildIds.update((map) => {
      const next: Record<number, number[]> = {};
      for (const [k, v] of Object.entries(map)) {
        next[Number(k)] = v.filter((id) => id !== childId);
      }
      return next;
    });
    this.saveBookingDraft();
  }

  updateChildAge(childId: number, age: number | null): void {
    this.children.update((list) =>
      list.map((c) => (c.id === childId ? { ...c, age } : c))
    );
    this.saveBookingDraft();
  }

  onChildAgeSelect(childId: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value;
    const age = val === '' ? null : parseInt(val, 10);
    this.updateChildAge(childId, age !== null && !isNaN(age) ? age : null);
  }

  // ── Per-Room Guest Assignment Logic ─────────────────────────
  getAssignedAdults(roomId: number): number {
    const custom = this.customRoomAdults()[roomId];
    if (custom !== undefined) return custom;
    const rooms = this.selectedRooms();
    const count = rooms.length;
    if (count <= 1) return this.adultsCount();
    const idx = rooms.findIndex((r) => r.id === roomId);
    if (idx === -1) return 0;
    const total = this.adultsCount();
    const base = Math.floor(total / count);
    const rem = total % count;
    return base + (idx < rem ? 1 : 0);
  }

  getAssignedChildren(roomId: number): ChildGuest[] {
    const customIds = this.customRoomChildIds()[roomId];
    const allChildren = this.children();
    if (customIds !== undefined) {
      return allChildren.filter((c) => customIds.includes(c.id));
    }
    const rooms = this.selectedRooms();
    const count = rooms.length;
    if (count <= 1) return [...allChildren];
    const idx = rooms.findIndex((r) => r.id === roomId);
    if (idx === -1) return [];
    return allChildren.filter((_, i) => i % count === idx);
  }

  getRoomCapacityChildren(roomId: number): number {
    return this.getAssignedChildren(roomId).filter(
      (c) => c.age !== null && c.age >= 12 && c.age <= 17
    ).length;
  }

  getRoomRequiredCapacity(roomId: number): number {
    return this.getAssignedAdults(roomId) + this.getRoomCapacityChildren(roomId);
  }

  isRoomOverCapacity(room: RoomDTO): boolean {
    return this.getRoomRequiredCapacity(room.id) > (room.capacity || 0);
  }

  increaseRoomAdults(roomId: number): void {
    const current = this.getAssignedAdults(roomId);
    this.customRoomAdults.update((map) => ({ ...map, [roomId]: current + 1 }));
    this.saveBookingDraft();
  }

  decreaseRoomAdults(roomId: number): void {
    const current = this.getAssignedAdults(roomId);
    if (current > 0) {
      this.customRoomAdults.update((map) => ({ ...map, [roomId]: current - 1 }));
      this.saveBookingDraft();
    }
  }

  toggleChildAssignment(roomId: number, childId: number): void {
    const currentIds = this.getAssignedChildren(roomId).map((c) => c.id);
    const isCurrentlyAssigned = currentIds.includes(childId);

    this.customRoomChildIds.update((map) => {
      const next: Record<number, number[]> = { ...map };
      for (const r of this.selectedRooms()) {
        const list = next[r.id] !== undefined
          ? next[r.id]
          : this.getAssignedChildren(r.id).map((c) => c.id);

        if (r.id === roomId) {
          next[r.id] = isCurrentlyAssigned
            ? list.filter((id) => id !== childId)
            : [...list.filter((id) => id !== childId), childId];
        } else if (!isCurrentlyAssigned) {
          next[r.id] = list.filter((id) => id !== childId);
        }
      }
      return next;
    });
    this.saveBookingDraft();
  }

  isChildAssignedToRoom(roomId: number, childId: number): boolean {
    return this.getAssignedChildren(roomId).some((c) => c.id === childId);
  }

  resetRoomAssignments(): void {
    this.customRoomAdults.set({});
    this.customRoomChildIds.set({});
    this.saveBookingDraft();
  }

  // ── Booking Summary Sidebar Handlers ────────────────────────
  openSidebar(): void {
    this.sidebarVisible.set(true);
  }

  closeSidebar(): void {
    this.sidebarVisible.set(false);
  }

  onSidebarVisibleChange(visible: boolean): void {
    this.sidebarVisible.set(visible);
  }

  onSidebarRoomAdultsChange(event: { roomId: number; delta: number }): void {
    const current = this.getAssignedAdults(event.roomId);
    const updated = Math.max(1, current + event.delta);
    this.customRoomAdults.update((map) => ({ ...map, [event.roomId]: updated }));

    const totalAssigned = this.selectedRooms().reduce((sum, r) => {
      if (r.id === event.roomId) return sum + updated;
      return sum + this.getAssignedAdults(r.id);
    }, 0);
    this.adultsCount.set(totalAssigned);
    this.saveBookingDraft();
  }

  onSidebarAddChild(roomId: number): void {
    const newChildId = this.nextChildId++;
    const newChild: ChildGuest = { id: newChildId, age: null };
    this.children.update((list) => [...list, newChild]);
    this.customRoomChildIds.update((map) => {
      const existing = map[roomId] !== undefined
        ? map[roomId]
        : this.getAssignedChildren(roomId).map((c) => c.id);
      return { ...map, [roomId]: [...existing, newChildId] };
    });
    this.saveBookingDraft();
  }

  onSidebarRemoveChild(event: { childId: number; roomId: number }): void {
    this.removeChild(event.childId);
  }

  onSidebarChildAgeChange(event: { childId: number; age: number | null }): void {
    this.updateChildAge(event.childId, event.age);
  }

  onSidebarRemoveRoom(roomId: number): void {
    this.deselectRoom(roomId);
  }

  onSidebarAutoDistribute(): void {
    this.resetRoomAssignments();
  }

  onChangeDatesRequested(): void {
    this.sidebarVisible.set(false);
    setTimeout(() => {
      const el = document.getElementById('stay-dates-main-bar');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = document.getElementById('main-checkin') as HTMLInputElement | null;
        if (input) input.focus();
      }
    }, 100);
  }

  // ── Stay Dates Parsing & Actions ────────────────────────────
  getTodayString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  parseLocalDate(str: string): Date | null {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    const dt = new Date(y, m, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null;
    return dt;
  }

  formatDateToIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  onCheckInInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = target.value;
    this.checkInInput.set(val);

    const currentOut = this.checkOutInput();
    if (currentOut && val) {
      const parsedIn = this.parseLocalDate(val);
      const parsedOut = this.parseLocalDate(currentOut);
      if (parsedIn && parsedOut && parsedOut.getTime() <= parsedIn.getTime()) {
        this.checkOutInput.set('');
      }
    }
    this.syncDatesToQueryParams();
    this.saveBookingDraft();
  }

  onCheckOutInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.checkOutInput.set(target.value);
    this.syncDatesToQueryParams();
    this.saveBookingDraft();
  }

  syncDatesToQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        checkIn: this.checkInInput() || null,
        checkOut: this.checkOutInput() || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  // ── Booking Creation / Edit Action ──────────────────────────
  submitBooking(): void {
    if (!this.canSubmitBooking() || this.isSubmittingBooking()) return;

    // For unauthenticated guests: save booking draft and redirect to Login
    if (!this.authService.isAuthenticated()) {
      this.saveBookingDraft();
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const currentHotel = this.hotel();
    const currentHotelId = this.hotelId();
    const rooms = this.selectedRooms();

    if (!currentHotelId || rooms.some((r) => r.hotelId !== currentHotelId)) {
      this.bookingErrorMessage.set('All selected rooms must belong to the current hotel.');
      return;
    }

    const roomIds = Array.from(new Set(rooms.map((r) => r.id)));
    if (roomIds.length === 0) {
      this.bookingErrorMessage.set('Please select at least one room.');
      return;
    }

    const totalAssignedAdults = rooms.reduce((sum, r) => sum + this.getAssignedAdults(r.id), 0);
    const childAges: number[] = this.children()
      .filter((c) => c.age !== null && c.age !== undefined && c.age >= 0)
      .map((c) => Number(c.age));

    const checkIn = this.checkInInput();
    const checkOut = this.checkOutInput();

    if (!checkIn || !checkOut || !this.areStayDatesValid()) {
      this.bookingErrorMessage.set('Please provide valid check-in and check-out dates.');
      return;
    }

    const totalGuests = totalAssignedAdults + childAges.length;
    const payload: HotelBookingRequestDTO = {
      checkIn,
      checkOut,
      guests: totalGuests,
      adults: totalAssignedAdults,
      childAges,
      roomId: roomIds[0],
      roomIds,
    };

    this.isSubmittingBooking.set(true);
    this.bookingErrorMessage.set(null);
    this.bookingErrorStatus.set(null);

    // If editing an existing booking, dispatch PUT /api/hotel-bookings/{id}
    if (this.isEditMode()) {
      const editingId = this.editingBookingId();
      if (editingId) {
        this.hotelBookingService
          .updateHotelBooking(editingId, payload)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (updatedBooking: HotelBookingDTO) => {
              this.isSubmittingBooking.set(false);
              if (!updatedBooking.hotelName && currentHotel) {
                updatedBooking.hotelName = currentHotel.name;
              }
              this.confirmedBooking.set(updatedBooking);
              this.updateSuccessNotice.set(
                `Reservation #${editingId} has been successfully updated with your revised stay dates, room selections, and guest party.`
              );
              this.clearSelectedRooms();
              this.clearBookingDraft(currentHotelId);
              this.editingBookingId.set(null);
              this.editingBooking.set(null);

              this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { editBookingId: null, bookingId: null },
                queryParamsHandling: 'merge',
              });

              setTimeout(() => {
                const el = document.getElementById('booking-confirmation-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 80);
            },
            error: (err: any) => {
              this.isSubmittingBooking.set(false);
              const status = err?.status ?? err?.rawError?.status ?? 0;
              this.bookingErrorStatus.set(status);
              this.bookingErrorMessage.set(
                err?.message ||
                  'Failed to update your existing reservation. Please verify room availability and try again.'
              );
            },
          });
        return;
      }
    }

    // Default: Create a new booking
    this.hotelBookingService
      .createHotelBooking(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (booking: HotelBookingDTO) => {
          this.isSubmittingBooking.set(false);
          if (!booking.hotelName && currentHotel) {
            booking.hotelName = currentHotel.name;
          }
          this.confirmedBooking.set(booking);
          this.clearSelectedRooms();
          this.clearBookingDraft(currentHotelId);
          setTimeout(() => {
            const el = document.getElementById('booking-confirmation-section');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 80);
        },
        error: (err: any) => {
          this.isSubmittingBooking.set(false);
          const status = err?.status ?? err?.rawError?.status ?? 0;
          this.bookingErrorStatus.set(status);

          if (status === 401 || status === 403) {
            this.bookingErrorMessage.set(
              'Authentication required: Please sign in to your user account to confirm this reservation.'
            );
          } else if (status === 409) {
            this.bookingErrorMessage.set(
              err?.message || 'One or more of the selected rooms are no longer available for the specified stay dates.'
            );
          } else if (status === 400) {
            this.bookingErrorMessage.set(
              err?.message || 'Invalid booking details. Please verify your stay dates and room selections.'
            );
          } else {
            this.bookingErrorMessage.set(
              err?.message || 'A network or server error occurred while creating your reservation. Please try again.'
            );
          }
        },
      });
  }

  dismissConfirmation(): void {
    this.confirmedBooking.set(null);
    this.bookingErrorMessage.set(null);
    this.bookingErrorStatus.set(null);
    this.updateSuccessNotice.set(null);
  }

  // ── Existing Booking Editing Handlers ───────────────────────
  loadBookingForEditing(bId: number): void {
    this.hotelBookingService
      .getHotelBookingById(bId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (booking: HotelBookingDTO) => {
          this.editingBookingId.set(booking.id);
          this.editingBooking.set(booking);

          if (booking.checkIn) this.checkInInput.set(booking.checkIn);
          if (booking.checkOut) this.checkOutInput.set(booking.checkOut);

          const adults = booking.adults || booking.guests || 1;
          this.adultsCount.set(Math.max(1, adults));

          if (booking.childAges && Array.isArray(booking.childAges) && booking.childAges.length > 0) {
            const restoredChildren: ChildGuest[] = booking.childAges.map((age, i) => ({
              id: i + 1,
              age: Number(age),
            }));
            this.children.set(restoredChildren);
            this.nextChildId = restoredChildren.length + 1;
          } else {
            this.children.set([]);
          }

          const targetRoomIds: number[] = [];
          if (booking.rooms && booking.rooms.length > 0) {
            targetRoomIds.push(...booking.rooms.map((r) => r.id));
          } else if (booking.roomId) {
            targetRoomIds.push(booking.roomId);
          }

          this.pendingDraftRoomIds = targetRoomIds;
          const hId = this.hotelId();
          if (hId && this.rooms().length > 0) {
            this.reconcileDraftRooms(hId, this.rooms());
          }
        },
        error: (err) => {
          console.error('Failed to load existing booking for edit:', err);
        },
      });
  }

  cancelEditing(): void {
    this.editingBookingId.set(null);
    this.editingBooking.set(null);
    this.clearSelectedRooms();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { editBookingId: null, bookingId: null },
      queryParamsHandling: 'merge',
    });
  }

  // ── Draft Persistence & Reconciliation Helpers ─────────────
  private pendingDraftRoomIds: number[] = [];

  private getDraftStorageKey(hotelId: number): string {
    return `travel_ease_hotel_draft_${hotelId}`;
  }

  saveBookingDraft(): void {
    const hId = this.hotelId();
    if (!hId) return;

    const draft: HotelBookingDraft = {
      hotelId: hId,
      selectedRoomIds: this.selectedRooms().map((r) => r.id),
      checkIn: this.checkInInput(),
      checkOut: this.checkOutInput(),
      adultsCount: this.adultsCount(),
      children: this.children(),
      customRoomAdults: this.customRoomAdults(),
      customRoomChildIds: this.customRoomChildIds(),
      timestamp: Date.now(),
    };

    try {
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(this.getDraftStorageKey(hId), JSON.stringify(draft));
      }
    } catch (e) {
      console.warn('Failed to save hotel booking draft to sessionStorage', e);
    }
  }

  loadBookingDraft(hotelId: number): HotelBookingDraft | null {
    try {
      if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
        return null;
      }
      const raw = sessionStorage.getItem(this.getDraftStorageKey(hotelId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as HotelBookingDraft;
      return parsed && parsed.hotelId === hotelId ? parsed : null;
    } catch {
      return null;
    }
  }

  clearBookingDraft(hotelId?: number): void {
    const id = hotelId || this.hotelId();
    if (id) {
      try {
        if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(this.getDraftStorageKey(id));
        }
      } catch (e) {
        console.warn('Failed to remove hotel booking draft from sessionStorage', e);
      }
    }
  }

  private restoreDraftIfPresent(hotelId: number): void {
    const draft = this.loadBookingDraft(hotelId);
    if (!draft) return;

    if (draft.checkIn && draft.checkOut) {
      const dIn = this.parseLocalDate(draft.checkIn);
      const dOut = this.parseLocalDate(draft.checkOut);
      const today = this.parseLocalDate(this.getTodayString());
      if (dIn && dOut && dOut.getTime() > dIn.getTime() && today && dIn.getTime() >= today.getTime()) {
        if (!this.checkInInput()) this.checkInInput.set(draft.checkIn);
        if (!this.checkOutInput()) this.checkOutInput.set(draft.checkOut);
      }
    }

    if (draft.adultsCount && draft.adultsCount >= 1) {
      this.adultsCount.set(draft.adultsCount);
    }

    if (Array.isArray(draft.children)) {
      this.children.set(draft.children);
      const maxId = draft.children.reduce((max, c) => Math.max(max, c.id || 0), 0);
      if (maxId >= this.nextChildId) this.nextChildId = maxId + 1;
    }

    if (draft.customRoomAdults) this.customRoomAdults.set(draft.customRoomAdults);
    if (draft.customRoomChildIds) this.customRoomChildIds.set(draft.customRoomChildIds);
    if (Array.isArray(draft.selectedRoomIds) && draft.selectedRoomIds.length > 0) {
      this.pendingDraftRoomIds = [...draft.selectedRoomIds];
    }
  }

  private reconcileDraftRooms(hotelId: number, loadedRooms: RoomDTO[]): void {
    if (this.pendingDraftRoomIds.length === 0) return;

    const idsToFind = [...this.pendingDraftRoomIds];
    const presentInPage = loadedRooms.filter((r) => idsToFind.includes(r.id) && r.hotelId === hotelId);

    if (presentInPage.length === idsToFind.length) {
      this.selectedRooms.set(presentInPage);
      this.cleanupCustomAssignments(presentInPage);
      this.pendingDraftRoomIds = [];
      this.saveBookingDraft();
    } else {
      this.roomService
        .getRoomsByHotelId(hotelId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (allRooms) => {
            const validMatching = (allRooms || []).filter(
              (r) => idsToFind.includes(r.id) && r.hotelId === hotelId
            );
            this.selectedRooms.set(validMatching);
            this.cleanupCustomAssignments(validMatching);
            this.pendingDraftRoomIds = [];
            this.saveBookingDraft();
          },
          error: () => {
            if (presentInPage.length > 0) {
              this.selectedRooms.set(presentInPage);
              this.cleanupCustomAssignments(presentInPage);
            }
            this.pendingDraftRoomIds = [];
          },
        });
    }
  }

  private cleanupCustomAssignments(rooms: RoomDTO[]): void {
    const validIds = new Set(rooms.map((r) => r.id));
    this.customRoomAdults.update((map) => {
      const next: Record<number, number> = {};
      for (const [k, v] of Object.entries(map)) {
        if (validIds.has(Number(k))) next[Number(k)] = v;
      }
      return next;
    });
    this.customRoomChildIds.update((map) => {
      const next: Record<number, number[]> = {};
      for (const [k, v] of Object.entries(map)) {
        if (validIds.has(Number(k))) next[Number(k)] = v;
      }
      return next;
    });
  }

  // ── Navigation & Scrolling ──────────────────────────────────
  scrollToSummary(): void {
    const el = document.getElementById('booking-sidebar-card') || document.getElementById('booking-summary-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  scrollToRooms(): void {
    const el = document.getElementById('hotel-rooms-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
