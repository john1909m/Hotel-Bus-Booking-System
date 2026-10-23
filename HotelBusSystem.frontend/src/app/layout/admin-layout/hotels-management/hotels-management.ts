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
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

// Core Models & Services
import { HotelService } from '../../../core/services/hotel.service';
import { HotelDTO, HotelRequestDTO } from '../../../core/models/Hotel/hotel.model';
import { PageHotelDTO, HotelListParams } from '../../../core/models/Pagination/hotelPage.model';

@Component({
  selector: 'app-hotels-management',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    DialogModule,
    ToastModule,
    TagModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './hotels-management.html',
  styleUrl: './hotels-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelsManagement implements OnInit, OnDestroy {
  private readonly hotelService = inject(HotelService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  // ── State Signals ──────────────────────────────────────────
  readonly hotels = signal<HotelDTO[]>([]);
  readonly pageData = signal<PageHotelDTO | null>(null);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // ── Filter Signals ─────────────────────────────────────────
  readonly searchQuery = signal<string>('');
  readonly cityFilter = signal<string>('');
  readonly minRatingFilter = signal<number | null>(null);
  readonly sortFilter = signal<string>('');
  readonly currentPage = signal<number>(0); // 0-based indexing for Spring Data
  readonly pageSize = signal<number>(10);

  // ── Dialog Signals ─────────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingHotelId = signal<number | null>(null);

  readonly deleteDialogVisible = signal<boolean>(false);
  readonly hotelToDelete = signal<HotelDTO | null>(null);

  // ── Computed ───────────────────────────────────────────────
  readonly totalElements = computed(() => this.pageData()?.totalElements ?? 0);
  readonly totalPages = computed(() => this.pageData()?.totalPages ?? 0);
  readonly firstRow = computed(() => this.currentPage() * this.pageSize());
  readonly hasActiveFilters = computed(
    () =>
      !!(
        this.searchQuery() ||
        this.cityFilter() ||
        this.minRatingFilter() !== null ||
        this.sortFilter()
      )
  );

  // ── Reactive Form ──────────────────────────────────────────
  readonly hotelForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    address: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(1000)]],
    rating: [4.0, [Validators.min(0), Validators.max(5)]],
    latitude: [30.0444, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [31.2357, [Validators.required, Validators.min(-180), Validators.max(180)]],
    checkInTime: ['14:00', [Validators.required]],
    checkOutTime: ['11:00', [Validators.required]],
  });

  ngOnInit(): void {
    // Debounce search query changes
    this.searchSubject$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
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

  // ── Data Loading ───────────────────────────────────────────
  loadHotels(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: HotelListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
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
        next: (page) => {
          this.pageData.set(page);
          this.hotels.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load hotels. Please verify backend connection.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Hotels',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  // ── Filters & Search ───────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject$.next(value);
  }

  onCityChange(value: string): void {
    this.cityFilter.set(value);
    this.currentPage.set(0);
    this.loadHotels();
  }

  onRatingChange(value: string): void {
    const val = value ? parseFloat(value) : null;
    this.minRatingFilter.set(val);
    this.currentPage.set(0);
    this.loadHotels();
  }

  onSortChange(value: string): void {
    this.sortFilter.set(value);
    this.currentPage.set(0);
    this.loadHotels();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.cityFilter.set('');
    this.minRatingFilter.set(null);
    this.sortFilter.set('');
    this.currentPage.set(0);
    this.loadHotels();
  }

  // ── PrimeNG Table Page Event ───────────────────────────────
  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.currentPage.set(pageIndex);
    this.loadHotels();
  }

  // ── Create & Edit Modal Handlers ───────────────────────────
  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.editingHotelId.set(null);
    this.hotelForm.reset({
      name: '',
      city: '',
      address: '',
      description: '',
      rating: 4.0,
      latitude: 30.0444,
      longitude: 31.2357,
      checkInTime: '14:00',
      checkOutTime: '11:00',
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(hotel: HotelDTO): void {
    this.isEditMode.set(true);
    this.editingHotelId.set(hotel.id);
    this.hotelForm.patchValue({
      name: hotel.name,
      city: hotel.city,
      address: hotel.address,
      description: hotel.description || '',
      rating: hotel.rating ?? 4.0,
      latitude: hotel.latitude ?? 30.0444,
      longitude: (hotel as any).longitude ?? hotel.longitude ?? 31.2357,
      checkInTime: hotel.checkInTime || '14:00',
      checkOutTime: hotel.checkOutTime || '11:00',
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.hotelForm.reset();
  }

  saveHotel(): void {
    if (this.hotelForm.invalid) {
      this.hotelForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly.',
        life: 4000,
      });
      return;
    }

    this.saving.set(true);
    const formVal = this.hotelForm.getRawValue();

    const payload: HotelRequestDTO = {
      name: formVal.name.trim(),
      city: formVal.city.trim(),
      address: formVal.address.trim(),
      description: formVal.description ? formVal.description.trim() : '',
      rating: Number(formVal.rating) || 0,
      latitude: Number(formVal.latitude) || 0,
      longitude: Number(formVal.longitude) || 0,
      checkInTime: formVal.checkInTime ? formVal.checkInTime.trim() : '14:00',
      checkOutTime: formVal.checkOutTime ? formVal.checkOutTime.trim() : '11:00',
    };

    if (this.isEditMode()) {
      const id = this.editingHotelId();
      if (!id) {
        this.saving.set(false);
        return;
      }

      this.hotelService
        .updateHotel(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Hotel Updated',
              detail: `"${updated.name}" has been updated successfully.`,
              life: 4000,
            });
            this.loadHotels();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to update hotel.';
            this.messageService.add({
              severity: 'error',
              summary: 'Update Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    } else {
      this.hotelService
        .createHotel(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Hotel Created',
              detail: `"${created.name}" has been created successfully.`,
              life: 4000,
            });
            this.currentPage.set(0);
            this.loadHotels();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to create hotel.';
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
  confirmDelete(hotel: HotelDTO): void {
    this.hotelToDelete.set(hotel);
    this.deleteDialogVisible.set(true);
  }

  cancelDelete(): void {
    this.deleteDialogVisible.set(false);
    this.hotelToDelete.set(null);
  }

  executeDelete(): void {
    const hotel = this.hotelToDelete();
    if (!hotel) return;

    this.deleting.set(true);
    this.hotelService
      .deleteHotel(hotel.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.hotelToDelete.set(null);

          this.messageService.add({
            severity: 'success',
            summary: 'Hotel Deleted',
            detail: `"${hotel.name}" has been successfully removed.`,
            life: 4000,
          });

          // Handle edge case: if this was the last item on current page and not first page,
          // move to the previous page before reloading
          if (this.hotels().length === 1 && this.currentPage() > 0) {
            this.currentPage.update((p) => p - 1);
          }

          this.loadHotels();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = err?.message || 'Failed to delete hotel.';
          this.messageService.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  // ── Validation Helpers ─────────────────────────────────────
  isFieldInvalid(fieldName: string): boolean {
    const control = this.hotelForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
