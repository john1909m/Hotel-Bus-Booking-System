import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { HotelService } from '../../../core/services/hotel.service';
import { RoomService } from '../../../core/services/room.service';
import { HotelDTO } from '../../../core/models/Hotel/hotel.model';
import { RoomDTO, roomType } from '../../../core/models/Room/room.model';
import { PagedModelRoomDto } from '../../../core/models/Pagination/roomPage.model';

export interface ChildGuest {
  id: number;
  age: number | null;
}

type LoadState = 'loading' | 'success' | 'empty' | 'error';
type CapacityValidationStatus = 'no-rooms' | 'missing-age' | 'exceeded' | 'valid';

@Component({
  selector: 'app-hotel-details',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, FormsModule],
  templateUrl: './hotel-details.html',
  styleUrl: './hotel-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelDetails implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hotelService = inject(HotelService);
  private readonly roomService = inject(RoomService);
  private readonly destroy$ = new Subject<void>();

  // ── Hotel State ─────────────────────────────────────────────
  readonly hotelId = signal<number | null>(null);
  readonly hotel = signal<HotelDTO | null>(null);
  readonly hotelState = signal<LoadState>('loading');
  readonly hotelError = signal<string>('');

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
  readonly selectedRoomIdSet = computed(() => {
    return new Set(this.selectedRooms().map((r) => r.id));
  });
  readonly selectedRoomsCount = computed(() => {
    return this.selectedRooms().length;
  });

  // ── Guest Selection State ───────────────────────────────────
  readonly adultsCount = signal<number>(2);
  readonly children = signal<ChildGuest[]>([]);
  private nextChildId = 1;
  readonly availableChildAges: readonly number[] = Array.from({ length: 18 }, (_, i) => i);

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

  readonly isGuestSelectionValid = computed(() => {
    return (
      this.selectedRooms().length > 0 &&
      this.adultsCount() >= 1 &&
      this.allChildAgesValid() &&
      this.requiredCapacity() <= this.totalRoomCapacity()
    );
  });

  readonly capacityStatus = computed<CapacityValidationStatus>(() => {
    if (this.selectedRooms().length === 0) {
      return 'no-rooms';
    }
    if (!this.allChildAgesValid()) {
      return 'missing-age';
    }
    if (this.requiredCapacity() > this.totalRoomCapacity()) {
      return 'exceeded';
    }
    return 'valid';
  });

  // ── Computed Values ─────────────────────────────────────────
  readonly starArray = computed(() => {
    const rating = Math.round(this.hotel()?.rating ?? 0);
    const valid = Math.max(0, Math.min(5, rating));
    return Array.from({ length: 5 }, (_, i) => (i < valid ? 1 : 0));
  });

  readonly hasCoordinates = computed(() => {
    const h = this.hotel();
    return h?.latitude !== null && h?.latitude !== undefined &&
           h?.longitude !== null && h?.longitude !== undefined;
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
  readonly isLastPage = computed(() => {
    const total = this.totalRoomsPages();
    return this.currentRoomsPage() >= total - 1;
  });

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
    const counts: Record<string, number> = {
      ALL: allRooms.length,
      SINGLE: 0,
      DOUBLE: 0,
      SUITE: 0,
      DELUXE: 0,
    };
    for (const r of allRooms) {
      if (counts[r.roomType] !== undefined) {
        counts[r.roomType]++;
      }
    }
    return counts;
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const idParam = params.get('id');
      const id = idParam ? parseInt(idParam, 10) : NaN;

      if (isNaN(id) || id <= 0) {
        this.hotelError.set('Invalid Hotel ID provided.');
        this.hotelState.set('error');
        this.roomsState.set('empty');
        return;
      }

      // If navigating to a different hotel, isolate selection state by clearing previous hotel's rooms
      if (this.hotelId() !== id) {
        this.clearSelectedRooms();
      }

      this.hotelId.set(id);
      this.currentRoomsPage.set(0);
      this.loadHotel(id);
      this.loadRooms(id);
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
          this.hotelError.set(
            err?.message || 'We could not find the requested hotel or it has been removed.'
          );
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
        },
        error: (err) => {
          // If paginated call fails, attempt fallback to unpaginated hotel rooms
          this.roomService
            .getRoomsByHotelId(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (unpaginated) => {
                const list = Array.isArray(unpaginated) ? unpaginated : [];
                this.rooms.set(list);
                this.roomsState.set(list.length === 0 ? 'empty' : 'success');
              },
              error: () => {
                this.roomsError.set(
                  err?.message || 'Failed to load rooms for this hotel. Please try again later.'
                );
                this.roomsState.set('error');
              },
            });
        },
      });
  }

  retryLoad(): void {
    const id = this.hotelId();
    if (id) {
      this.loadHotel(id);
      this.loadRooms(id);
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
      if (roomsEl) {
        roomsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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
      case 'SINGLE':
        return 'Single Room';
      case 'DOUBLE':
        return 'Double Room';
      case 'SUITE':
        return 'Executive Suite';
      case 'DELUXE':
        return 'Deluxe Room';
      default:
        return type || 'Standard Room';
    }
  }

  getRoomTypeBadgeClass(type: roomType | string): string {
    switch (type) {
      case 'SINGLE':
        return 'badge-single';
      case 'DOUBLE':
        return 'badge-double';
      case 'SUITE':
        return 'badge-suite';
      case 'DELUXE':
        return 'badge-deluxe';
      default:
        return 'badge-default';
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

    // Selection isolation: prevent selecting rooms belonging to a different hotel
    const currentHotelId = this.hotelId();
    if (currentHotelId !== null && room.hotelId !== currentHotelId) {
      return;
    }

    const current = this.selectedRooms();
    const isAlreadySelected = current.some((r) => r.id === room.id);

    if (isAlreadySelected) {
      this.selectedRooms.set(current.filter((r) => r.id !== room.id));
    } else {
      this.selectedRooms.set([...current, room]);
    }
  }

  deselectRoom(roomId: number): void {
    this.selectedRooms.set(this.selectedRooms().filter((r) => r.id !== roomId));
  }

  clearSelectedRooms(): void {
    this.selectedRooms.set([]);
  }

  // ── Guest Selection Actions ────────────────────────────────
  increaseAdults(): void {
    this.adultsCount.update((count) => count + 1);
  }

  decreaseAdults(): void {
    this.adultsCount.update((count) => Math.max(1, count - 1));
  }

  addChild(): void {
    this.children.update((list) => [
      ...list,
      { id: this.nextChildId++, age: null },
    ]);
  }

  removeLastChild(): void {
    if (this.children().length > 0) {
      this.children.update((list) => list.slice(0, -1));
    }
  }

  removeChild(childId: number): void {
    this.children.update((list) => list.filter((c) => c.id !== childId));
  }

  updateChildAge(childId: number, age: number | null): void {
    this.children.update((list) =>
      list.map((c) => (c.id === childId ? { ...c, age } : c))
    );
  }

  onChildAgeSelect(childId: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value;
    const age = val === '' ? null : parseInt(val, 10);
    this.updateChildAge(childId, age !== null && !isNaN(age) ? age : null);
  }
}
