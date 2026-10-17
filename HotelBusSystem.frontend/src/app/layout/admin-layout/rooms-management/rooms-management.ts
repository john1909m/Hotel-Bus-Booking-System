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
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

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
  readonly hotels = signal<HotelDTO[]>([]);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // ── Filters Signals ────────────────────────────────────────
  readonly searchQuery = signal<string>('');
  readonly selectedHotelId = signal<number | null>(null);
  readonly roomTypeFilter = signal<string>('');

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
    roomType: ['SINGLE', [Validators.required]],
    capacity: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
    pricePerNight: [100, [Validators.required, Validators.min(1)]],
  });

  // ── Computed Filtered Rooms ────────────────────────────────
  readonly filteredRooms = computed(() => {
    let list = this.rooms();
    const query = this.searchQuery().trim().toLowerCase();
    const hotelId = this.selectedHotelId();
    const rType = this.roomTypeFilter();

    if (hotelId !== null) {
      list = list.filter((r) => r.hotelId === hotelId);
    }
    if (rType) {
      list = list.filter((r) => r.roomType === rType);
    }
    if (query) {
      list = list.filter(
        (r) =>
          r.roomNumber.toLowerCase().includes(query) ||
          this.getHotelName(r.hotelId).toLowerCase().includes(query)
      );
    }
    return list;
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
      });

    this.loadHotels();
    this.loadRooms();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data Loading ───────────────────────────────────────────
  loadHotels(): void {
    this.hotelService
      .lookupHotels({ size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.hotels.set(page.content || []);
        },
        error: () => {
          // Non-blocking: fallback to empty list
          this.hotels.set([]);
        },
      });
  }

  loadRooms(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const hotelId = this.selectedHotelId();

    const request$ =
      hotelId !== null
        ? this.roomService.getRoomsByHotelId(hotelId)
        : this.roomService.getAllRooms();

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
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

  // ── Filter Handlers ────────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchSubject$.next(value);
  }

  onHotelChange(value: string): void {
    const parsed = value ? parseInt(value, 10) : null;
    this.selectedHotelId.set(isNaN(parsed as any) ? null : parsed);
    this.loadRooms();
  }

  onRoomTypeChange(value: string): void {
    this.roomTypeFilter.set(value);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedHotelId.set(null);
    this.roomTypeFilter.set('');
    this.loadRooms();
  }

  // ── Helper ─────────────────────────────────────────────────
  getHotelName(hotelId: number): string {
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
    this.roomForm.reset({
      roomNumber: '',
      hotelId: this.selectedHotelId() ?? (this.hotels().length > 0 ? this.hotels()[0].id : null),
      roomType: 'SINGLE',
      capacity: 2,
      pricePerNight: 100,
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(room: RoomDTO): void {
    this.isEditMode.set(true);
    this.editingRoomId.set(room.id);
    this.roomForm.patchValue({
      roomNumber: room.roomNumber,
      hotelId: room.hotelId,
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

    const payload: RoomRequestDTO = {
      roomNumber: String(formVal.roomNumber).trim(),
      hotelId: Number(formVal.hotelId),
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
