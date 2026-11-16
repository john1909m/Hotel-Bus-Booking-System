import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, map } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

// Core Models & Services
import { RoomService } from '../../../core/services/room.service';
import { HotelService } from '../../../core/services/hotel.service';
import { RoomDTO, RoomRequestDTO, roomType } from '../../../core/models/Room/room.model';
import { HotelDTO } from '../../../core/models/Hotel/hotel.model';
import { PagedModelRoomDto } from '../../../core/models/Pagination/roomPage.model';

@Component({
  selector: 'app-rooms-management',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    ToastModule,
    TagModule,
    TranslatePipe,
  ],
  providers: [MessageService],
  templateUrl: './rooms-management.html',
  styleUrl: './rooms-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomsManagement implements OnInit, OnDestroy {
  private readonly roomService = inject(RoomService);
  private readonly hotelService = inject(HotelService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService, { optional: true });
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  // ── State Signals ──────────────────────────────────────────
  readonly rooms = signal<RoomDTO[]>([]);
  readonly pageData = signal<PagedModelRoomDto | null>(null);
  readonly allRoomsCache = signal<RoomDTO[] | null>(null);
  readonly hotels = signal<HotelDTO[]>([]);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // ── Filters & Pagination Signals ───────────────────────────
  readonly searchQuery = signal<string>('');
  readonly selectedHotelId = signal<number | null>(null);
  readonly roomTypeFilter = signal<string>('');
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

  // ── Dialog Signals ─────────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingRoomId = signal<number | null>(null);

  readonly deleteDialogVisible = signal<boolean>(false);
  readonly roomToDelete = signal<RoomDTO | null>(null);

  // ── Reactive Form ──────────────────────────────────────────
  readonly roomForm: FormGroup = this.fb.group({
    roomNumber: ['', [Validators.required, Validators.maxLength(50)]],
    hotelId: [null, [Validators.required]],
    hotelName: ['', [Validators.required]],
    roomType: ['SINGLE', [Validators.required]],
    capacity: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
    pricePerNight: [100, [Validators.required, Validators.min(1)]],
  });

  get hotelName() {
    return this.roomForm.get('hotelName');
  }

  // ── Dynamic Filter Options from Loaded Data ────────────────
  readonly availableHotels = computed(() => {
    const list = this.allRoomsCache() || this.rooms();
    const mapHotels = new Map<number, string>();
    for (const r of list) {
      if (r.hotelId && r.hotelName) {
        mapHotels.set(r.hotelId, r.hotelName);
      }
    }
    // If cache not loaded yet and hotels() loaded for dialog, merge them
    if (mapHotels.size === 0 && this.hotels().length > 0) {
      for (const h of this.hotels()) {
        mapHotels.set(h.id, h.name);
      }
    }
    return Array.from(mapHotels.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly availableRoomTypes = computed(() => {
    const list = this.allRoomsCache() || this.rooms();
    const setTypes = new Set<string>();
    for (const r of list) {
      if (r.roomType) {
        setTypes.add(r.roomType);
      }
    }
    return Array.from(setTypes).sort((a, b) => a.localeCompare(b));
  });

  // ── Computed Filter State ──────────────────────────────────
  readonly isFilterActive = computed(
    () => !!(this.searchQuery().trim() || this.selectedHotelId() !== null || this.roomTypeFilter().trim())
  );

  readonly filteredRooms = computed(() => {
    const list = this.allRoomsCache() || this.rooms();
    const query = this.searchQuery().trim().toLowerCase();
    const hotelId = this.selectedHotelId();
    const rType = this.roomTypeFilter().trim();

    if (!query && hotelId === null && !rType) {
      return list;
    }

    return list.filter((r) => {
      if (hotelId !== null && r.hotelId !== hotelId) {
        return false;
      }
      if (rType && r.roomType !== rType) {
        return false;
      }
      if (query) {
        const roomNum = (r.roomNumber || '').toLowerCase();
        const hotelName = (r.hotelName || '').toLowerCase();
        const roomTypeStr = (r.roomType || '').toLowerCase();
        const priceStr = String(r.pricePerNight ?? '');
        const matches =
          roomNum.includes(query) ||
          hotelName.includes(query) ||
          roomTypeStr.includes(query) ||
          priceStr.includes(query);
        if (!matches) {
          return false;
        }
      }
      return true;
    });
  });

  readonly displayedRooms = computed(() => {
    if (this.isFilterActive()) {
      const start = this.firstRow();
      return this.filteredRooms().slice(start, start + this.pageSize());
    }
    return this.rooms();
  });

  readonly totalElements = computed(() => {
    if (this.isFilterActive()) {
      return this.filteredRooms().length;
    }
    return this.pageData()?.totalElements ?? this.pageData()?.page?.totalElements ?? 0;
  });

  readonly totalPages = computed(() => {
    if (this.isFilterActive()) {
      const total = this.filteredRooms().length;
      return Math.ceil(total / this.pageSize());
    }
    return this.pageData()?.totalPages ?? this.pageData()?.page?.totalPages ?? 0;
  });

  readonly firstRow = computed(() => this.currentPage() * this.pageSize());

  readonly hasActiveFilters = computed(
    () => !!(this.searchQuery() || this.selectedHotelId() !== null || this.roomTypeFilter())
  );

  ngOnInit(): void {
    // Debounce search query (300ms)
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.currentPage.set(0);
        this.handleFilterChange();
      });

    // Synchronize hotelId changes to hotelName in modal form
    this.roomForm
      .get('hotelId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        if (id !== null && id !== undefined && id !== '') {
          const hotel = this.hotels().find((h) => h.id === Number(id));
          const name = hotel ? hotel.name : '';
          this.roomForm.patchValue(
            { hotelName: name },
            { emitEvent: false }
          );
        }
      });

    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data Loading ───────────────────────────────────────────
  loadInitialData(): void {
    this.searchQuery.set('');
    this.selectedHotelId.set(null);
    this.roomTypeFilter.set('');
    this.currentPage.set(0);
    this.loadRooms();
  }

  loadRooms(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.roomService
      .getAllRooms({
        page: this.currentPage(),
        size: this.pageSize(),
        sort: 'id,asc',
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.rooms.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load rooms. Please check backend connection.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Rooms',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  loadFilteredRooms(): void {
    if (this.allRoomsCache()) {
      return;
    }
    this.loading.set(true);
    this.roomService
      .getAllRoomsCatalog()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (catalog) => {
          this.allRoomsCache.set(catalog);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load rooms catalog.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Catalog',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  loadHotelsForDialog(): void {
    this.hotelService
      .lookupHotels({ size: 100 })
      .pipe(
        map((res: any) => (Array.isArray(res) ? res : res?.content || [])),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (list: HotelDTO[]) => {
          this.hotels.set(list);
        },
        error: () => {
          this.hotels.set([]);
        },
      });
  }

  // ── Filter Handlers ────────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchSubject$.next(value);
  }

  onHotelChange(value: string): void {
    const parsed = value ? parseInt(value, 10) : null;
    this.selectedHotelId.set(isNaN(parsed as any) ? null : parsed);
    this.currentPage.set(0);
    this.handleFilterChange();
  }

  onRoomTypeChange(value: string): void {
    this.roomTypeFilter.set(value);
    this.currentPage.set(0);
    this.handleFilterChange();
  }

  handleFilterChange(): void {
    if (this.isFilterActive()) {
      if (!this.allRoomsCache()) {
        this.loadFilteredRooms();
      }
    } else {
      this.loadRooms();
    }
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedHotelId.set(null);
    this.roomTypeFilter.set('');
    this.currentPage.set(0);
    this.loadRooms();
  }

  // ── PrimeNG Table Page Event ───────────────────────────────
  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.currentPage.set(pageIndex);
    if (!this.isFilterActive()) {
      this.loadRooms();
    }
  }

  getRoomTypeSeverity(type: roomType | string): 'info' | 'warn' | 'success' | 'secondary' {
    switch (type) {
      case 'SINGLE':
        return 'info';
      case 'DOUBLE':
        return 'secondary';
      case 'SUITE':
        return 'warn';
      case 'DELUXE':
        return 'success';
      default:
        return 'info';
    }
  }

  // ── Create & Edit Modal Handlers ───────────────────────────
  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.editingRoomId.set(null);

    if (this.hotels().length === 0) {
      this.loadHotelsForDialog();
    }

    const defaultHotel = this.hotels().length > 0 ? this.hotels()[0] : null;
    const defaultHotelId = defaultHotel?.id ?? null;
    const defaultHotelName = defaultHotel?.name ?? '';

    this.roomForm.reset({
      roomNumber: '',
      hotelId: defaultHotelId,
      hotelName: defaultHotelName,
      roomType: 'SINGLE',
      capacity: 2,
      pricePerNight: 100,
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(room: RoomDTO): void {
    this.isEditMode.set(true);
    this.editingRoomId.set(room.id);

    if (this.hotels().length === 0) {
      this.loadHotelsForDialog();
    }

    const hName = room.hotelName || '';

    // Ensure the room's hotel exists in the hotels signal so the modal select can display it
    if (room.hotelId && !this.hotels().some((h) => h.id === room.hotelId)) {
      this.hotels.update((list) => [
        ...list,
        { id: room.hotelId, name: hName, city: '' } as HotelDTO,
      ]);
    }

    this.roomForm.patchValue({
      roomNumber: room.roomNumber,
      hotelId: room.hotelId,
      hotelName: hName,
      roomType: room.roomType,
      capacity: room.capacity,
      pricePerNight: room.pricePerNight,
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.roomForm.reset();
  }

  saveRoom(): void {
    if (this.roomForm.invalid) {
      this.roomForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly.',
        life: 4000,
      });
      return;
    }

    this.saving.set(true);
    const formVal = this.roomForm.getRawValue();

    let targetHotelId = formVal.hotelId ? Number(formVal.hotelId) : null;
    if (!targetHotelId && formVal.hotelName) {
      const match = this.hotels().find(
        (h) => h.name.trim().toLowerCase() === String(formVal.hotelName).trim().toLowerCase()
      );
      if (match) targetHotelId = match.id;
    }

    const payload: RoomRequestDTO = {
      roomNumber: String(formVal.roomNumber).trim(),
      hotelId: Number(targetHotelId),
      roomType: formVal.roomType,
      capacity: Number(formVal.capacity),
      pricePerNight: Number(formVal.pricePerNight),
    };

    if (this.isEditMode()) {
      const id = this.editingRoomId();
      if (!id) {
        this.saving.set(false);
        return;
      }

      this.roomService
        .updateRoom(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Room Updated',
              detail: `Room ${updated.roomNumber} has been successfully updated.`,
              life: 4000,
            });
            this.allRoomsCache.set(null);
            this.loadRooms();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to update room.';
            this.messageService.add({
              severity: 'error',
              summary: 'Update Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    } else {
      this.roomService
        .createRoom(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Room Created',
              detail: `Room ${created.roomNumber} has been added.`,
              life: 4000,
            });
            this.currentPage.set(0);
            this.allRoomsCache.set(null);
            this.loadRooms();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to create room.';
            this.messageService.add({
              severity: 'error',
              summary: 'Creation Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    }
  }

  // ── Delete Confirmation Handlers ───────────────────────────
  openDeleteDialog(room: RoomDTO): void {
    this.roomToDelete.set(room);
    this.deleteDialogVisible.set(true);
  }

  closeDeleteDialog(): void {
    this.deleteDialogVisible.set(false);
    this.roomToDelete.set(null);
  }

  confirmDeleteRoom(): void {
    const room = this.roomToDelete();
    if (!room) return;

    this.deleting.set(true);
    this.roomService
      .deleteRoom(room.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.roomToDelete.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Room Deleted',
            detail: `Room ${room.roomNumber} has been removed.`,
            life: 4000,
          });

          if (this.rooms().length === 1 && this.currentPage() > 0) {
            this.currentPage.update((p) => p - 1);
          }
          this.allRoomsCache.set(null);
          this.loadRooms();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = err?.message || 'Failed to delete room.';
          this.messageService.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail: msg,
            life: 5000,
          });
        },
      });
  }
}
