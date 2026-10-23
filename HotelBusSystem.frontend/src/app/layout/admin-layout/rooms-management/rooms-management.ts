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
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  // ── State Signals ──────────────────────────────────────────
  readonly rooms = signal<RoomDTO[]>([]);
  readonly pageData = signal<PagedModelRoomDto | null>(null);
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

  // ── Computed Signals ───────────────────────────────────────
  readonly isPaginatedMode = computed(
    () => this.selectedHotelId() !== null && this.pageData() !== null
  );

  readonly totalElements = computed(() => {
    if (this.isPaginatedMode()) {
      if (this.searchQuery() || this.roomTypeFilter()) {
        return this.filteredRooms().length;
      }
      return this.pageData()?.page?.totalElements ?? 0;
    }
    return this.filteredRooms().length;
  });

  readonly totalPages = computed(() => {
    if (this.isPaginatedMode()) {
      return this.pageData()?.page?.totalPages ?? 0;
    }
    const total = this.filteredRooms().length;
    return Math.ceil(total / this.pageSize());
  });

  readonly firstRow = computed(() => this.currentPage() * this.pageSize());

  readonly filteredRooms = computed(() => {
    let list = this.rooms();
    const query = this.searchQuery().trim().toLowerCase();
    const hotelId = this.selectedHotelId();
    const rType = this.roomTypeFilter();

    // In paginated mode, hotel is already filtered by backend
    if (hotelId !== null && !this.isPaginatedMode()) {
      list = list.filter((r) => r.hotelId === hotelId);
    }
    if (rType) {
      list = list.filter((r) => r.roomType === rType);
    }
    if (query) {
      list = list.filter(
        (r) =>
          r.roomNumber.toLowerCase().includes(query) ||
          (r.hotelName && r.hotelName.toLowerCase().includes(query)) ||
          this.getHotelName(r.hotelId, r.hotelName).toLowerCase().includes(query)
      );
    }
    return list;
  });

  readonly displayedRooms = computed(() => {
    if (this.isPaginatedMode()) {
      // In paginated mode, backend returns the exact page slice in content
      return this.filteredRooms();
    }
    // In unpaginated mode, client-side slice according to currentPage & pageSize
    const start = this.firstRow();
    return this.filteredRooms().slice(start, start + this.pageSize());
  });

  readonly hasActiveFilters = computed(
    () =>
      !!(
        this.searchQuery() ||
        this.selectedHotelId() !== null ||
        this.roomTypeFilter()
      )
  );

  ngOnInit(): void {
    // Debounce search query
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.currentPage.set(0);
      });

    // Synchronize hotelId changes to hotelName and hotelNameProperty
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

    // Synchronize hotelNameProperty changes to hotelId and hotelName
    this.roomForm
      .get('hotelName')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((name) => {
        if (typeof name === 'string' && name.trim().length > 0) {
          this.roomForm.patchValue({ hotelName: name }, { emitEvent: false });
          const matched = this.hotels().find(
            (h) => h.name.trim().toLowerCase() === name.trim().toLowerCase()
          );
          if (matched && this.roomForm.get('hotelId')?.value !== matched.id) {
            this.roomForm.patchValue({ hotelId: matched.id }, { emitEvent: false });
          }
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
    // Ensure all filters are empty and unselected when the page initially loads
    this.searchQuery.set('');
    this.selectedHotelId.set(null);
    this.roomTypeFilter.set('');
    this.currentPage.set(0);

    this.loadHotels();
    this.loadRooms();
  }

  loadHotels(): void {
    this.hotelService
      .lookupHotels({ size: 100 })
      .pipe(
        map((res: any) => (Array.isArray(res) ? res : res?.content || [])),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (list: HotelDTO[]) => {
          this.hotels.set(list);
          const currentHotelId = this.roomForm.get('hotelId')?.value;
          if (currentHotelId && !this.roomForm.get('hotelName')?.value) {
            const h = list.find((item) => item.id === Number(currentHotelId));
            if (h) {
              this.roomForm.patchValue(
                { hotelName: h.name },
                { emitEvent: false }
              );
            }
          }
        },
        error: () => {
          this.hotels.set([]);
        },
      });
  }

  loadRooms(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const hotelId = this.selectedHotelId();

    if (hotelId !== null) {
      // Consumes backend PagedRoomModelDto via GET /api/hotels/{hotelId}/rooms
      this.roomService
        .getPaginatedRoomsByHotelId(hotelId, {
          page: this.currentPage(),
          size: this.pageSize(),
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (pagedModel) => {
            this.pageData.set(pagedModel);
            this.rooms.set(pagedModel?.content || []);
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
    } else {
      // Unpaginated full list endpoint
      this.roomService
        .getAllRooms()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => {
            this.pageData.set(null);
            this.rooms.set(Array.isArray(data) ? data : []);
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
  }

  // ── Filter Handlers ────────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchSubject$.next(value);
  }

  onHotelChange(value: string): void {
    const parsed = value ? parseInt(value, 10) : null;
    this.selectedHotelId.set(isNaN(parsed as any) ? null : parsed);
    this.currentPage.set(0);
    this.loadRooms();
  }

  onRoomTypeChange(value: string): void {
    this.roomTypeFilter.set(value);
    this.currentPage.set(0);
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
    if (this.isPaginatedMode()) {
      this.loadRooms();
    }
  }

  // ── Helper ─────────────────────────────────────────────────
  getHotelName(hotelId: number, fallbackHotelName?: string): string {
    if (fallbackHotelName && fallbackHotelName.trim().length > 0) {
      return fallbackHotelName.trim();
    }
    const found = this.hotels().find((h) => h.id === hotelId);
    return found ? found.name : `Hotel #${hotelId}`;
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
    const defaultHotel = this.selectedHotelId() !== null
      ? this.hotels().find((h) => h.id === this.selectedHotelId())
      : (this.hotels().length > 0 ? this.hotels()[0] : null);
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
    const hName = room.hotelName || this.getHotelName(room.hotelId);

    // Ensure the room's hotel exists in the hotels signal so the dropdown can display it
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

    // Ensure hotelId is resolved according to backend contract
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
              detail: `Room ${updated.roomNumber} was successfully updated.`,
              life: 4000,
            });
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
              detail: `Room ${created.roomNumber} was successfully added.`,
              life: 4000,
            });
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

  // ── Delete Handlers ────────────────────────────────────────
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
            detail: `Room ${room.roomNumber} has been deleted.`,
            life: 4000,
          });
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
