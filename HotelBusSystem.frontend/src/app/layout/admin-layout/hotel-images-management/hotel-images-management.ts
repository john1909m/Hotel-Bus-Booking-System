import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

// Core Services & Models
import { HotelService } from '../../../core/services/hotel.service';
import { RoomService } from '../../../core/services/room.service';
import { HotelImageService } from '../../../core/services/hotel-image.service';
import { ImageUploadService } from '../../../core/services/image-upload.service';
import { HotelDTO } from '../../../core/models/Hotel/hotel.model';
import { HotelImageDto } from '../../../core/models/Image/hotel_image.model';
import { SafeImageUrlPipe } from '../../../../utils/safe-image-url';


export type ImageCategoryFilter = 'ALL' | 'HOTEL_GALLERY' | string;

@Component({
  selector: 'app-hotel-images-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    ToastModule,
    TagModule,
    InputNumberModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    SafeImageUrlPipe,
  ],
  providers: [MessageService],
  templateUrl: './hotel-images-management.html',
  styleUrl: './hotel-images-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelImagesManagement implements OnInit, OnDestroy {
  private readonly hotelService = inject(HotelService);
  private readonly roomService = inject(RoomService);
  private readonly hotelImageService = inject(HotelImageService);
  private readonly imageUploadService = inject(ImageUploadService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  // ── State Signals ──────────────────────────────────────────
  readonly hotels = signal<HotelDTO[]>([]);
  readonly selectedHotelId = signal<number | null>(null);
  readonly images = signal<HotelImageDto[]>([]);
  readonly availableRoomTypes = signal<string[]>([]);

  readonly loadingHotels = signal<boolean>(false);
  readonly loadingImages = signal<boolean>(false);
  readonly loadingRooms = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // ── Filter State ───────────────────────────────────────────
  readonly categoryFilter = signal<ImageCategoryFilter>('ALL');

  // ── Upload Modal State ─────────────────────────────────────
  readonly uploadDialogVisible = signal<boolean>(false);
  readonly uploading = signal<boolean>(false);
  readonly uploadProgress = signal<number>(0);
  readonly uploadStepMessage = signal<string>('');
  readonly uploadError = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);

  // ── Delete Confirmation State ──────────────────────────────
  readonly deleteDialogVisible = signal<boolean>(false);
  readonly imageToDelete = signal<HotelImageDto | null>(null);
  readonly deleting = signal<boolean>(false);

  // ── Computed Signals ───────────────────────────────────────
  readonly selectedHotel = computed(() => {
    const id = this.selectedHotelId();
    if (!id) return null;
    return this.hotels().find((h) => h.id === id) ?? null;
  });

  readonly filteredImages = computed(() => {
    const list = this.images();
    const filter = this.categoryFilter();

    if (filter === 'ALL') {
      return list;
    }
    if (filter === 'HOTEL_GALLERY') {
      return list.filter((img) => !img.roomType);
    }
    return list.filter((img) => img.roomType === filter);
  });

  readonly hotelGalleryCount = computed(
    () => this.images().filter((img) => !img.roomType).length
  );

  // ── Reactive Upload Form ───────────────────────────────────
  readonly uploadForm: FormGroup = this.fb.group({
    categoryType: ['HOTEL', [Validators.required]], // 'HOTEL' | 'ROOM'
    roomType: [''],
    sortOrder: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.loadHotels();

    // Dynamically adjust validation when category changes
    this.uploadForm.get('categoryType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((category) => {
        const roomTypeCtrl = this.uploadForm.get('roomType');
        if (category === 'ROOM') {
          roomTypeCtrl?.setValidators([Validators.required]);
        } else {
          roomTypeCtrl?.clearValidators();
          roomTypeCtrl?.setValue('');
        }
        roomTypeCtrl?.updateValueAndValidity();
      });
  }

  ngOnDestroy(): void {
    this.clearFilePreview();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data Loading: Hotels ───────────────────────────────────
  loadHotels(): void {
    this.loadingHotels.set(true);
    this.errorMessage.set(null);

    this.hotelService
      .getHotels({ size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          const list = page.content || [];
          this.hotels.set(list);
          this.loadingHotels.set(false);

          // Auto-select first hotel if none selected and hotels exist
          if (!this.selectedHotelId() && list.length > 0) {
            this.selectHotel(list[0].id);
          }
        },
        error: (err) => {
          this.loadingHotels.set(false);
          const msg = err?.message || 'Failed to load hotels. Please ensure the backend is reachable.';
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

  // ── Hotel Selection Handling ───────────────────────────────
  selectHotel(hotelId: number | string): void {
    const numericId = Number(hotelId);
    if (!numericId || numericId === this.selectedHotelId()) {
      return;
    }

    this.selectedHotelId.set(numericId);
    this.categoryFilter.set('ALL');
    this.errorMessage.set(null);

    // Reset upload & delete state
    this.closeUploadDialog();
    this.cancelDelete();

    // Fetch images and rooms for the selected hotel
    this.loadImages(numericId);
    this.loadRooms(numericId);
  }

  loadImages(hotelId: number): void {
    this.loadingImages.set(true);

    this.hotelImageService
      .getImages(hotelId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (images) => {
          this.images.set(images);
          this.loadingImages.set(false);
        },
        error: (err) => {
          this.loadingImages.set(false);
          const msg = err?.message || 'Failed to load hotel gallery images.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Images',
            detail: msg,
            life: 4000,
          });
        },
      });
  }

  loadRooms(hotelId: number): void {
    this.loadingRooms.set(true);

    this.roomService
      .getRoomsByHotelId(hotelId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rooms) => {
          this.loadingRooms.set(false);
          // Extract unique room types dynamically from actual room records
          const types = Array.from(
            new Set((rooms || []).map((r) => r.roomType).filter(Boolean))
          );
          this.availableRoomTypes.set(types);
        },
        error: () => {
          this.loadingRooms.set(false);
          this.availableRoomTypes.set([]);
        },
      });
  }

  // ── Filter Controls ────────────────────────────────────────
  setFilter(filter: ImageCategoryFilter): void {
    this.categoryFilter.set(filter);
  }

  // ── Upload Dialog Handlers ─────────────────────────────────
  openUploadDialog(): void {
    if (!this.selectedHotelId()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Hotel Required',
        detail: 'Please select a hotel before uploading an image.',
        life: 3000,
      });
      return;
    }

    this.uploadForm.reset({
      categoryType: 'HOTEL',
      roomType: '',
      sortOrder: (this.images().length || 0) + 1,
    });
    this.clearFilePreview();
    this.uploadError.set(null);
    this.uploadProgress.set(0);
    this.uploadStepMessage.set('');
    this.uploading.set(false);
    this.uploadDialogVisible.set(true);
  }

  closeUploadDialog(): void {
    if (this.uploading()) {
      return; // Prevent closing while network transfer is active
    }
    this.uploadDialogVisible.set(false);
    this.clearFilePreview();
    this.uploadForm.reset();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate using existing Phase A ImageUploadService rules
    const validation = this.imageUploadService.validateFile(file);
    if (!validation.valid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid File',
        detail: validation.error || 'File validation failed.',
        life: 4000,
      });
      input.value = '';
      return;
    }

    // Release old preview if present
    this.clearFilePreview();

    // Create object URL for instant preview
    const objectUrl = URL.createObjectURL(file);
    this.selectedFile.set(file);
    this.previewUrl.set(objectUrl);
    this.uploadError.set(null);
  }

  clearFilePreview(): void {
    const current = this.previewUrl();
    if (current) {
      URL.revokeObjectURL(current);
      this.previewUrl.set(null);
    }
    this.selectedFile.set(null);
  }

  submitUpload(): void {
    const hotelId = this.selectedHotelId();
    const file = this.selectedFile();

    if (!hotelId) {
      this.uploadError.set('No hotel selected.');
      return;
    }

    if (!file) {
      this.uploadError.set('Please select an image file to upload.');
      return;
    }

    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }

    const formValue = this.uploadForm.getRawValue();
    const isRoom = formValue.categoryType === 'ROOM';
    const roomType = isRoom && formValue.roomType ? formValue.roomType.trim() : null;
    const sortOrder = Number(formValue.sortOrder) || 0;

    this.uploading.set(true);
    this.uploadProgress.set(5);
    this.uploadError.set(null);
    this.uploadStepMessage.set('Requesting presigned upload URL…');

    this.imageUploadService
      .uploadImage(hotelId, file, roomType, sortOrder)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          this.uploadProgress.set(state.progress);

          switch (state.step) {
            case 'requesting-url':
              this.uploadStepMessage.set('Requesting upload signature from server…');
              break;
            case 'uploading':
              this.uploadStepMessage.set(`Uploading directly to storage… (${state.progress}%)`);
              break;
            case 'registering':
              this.uploadStepMessage.set('Saving image metadata with hotel gallery…');
              break;
            case 'completed':
              this.uploadStepMessage.set('Image successfully registered!');
              this.uploading.set(false);
              this.uploadDialogVisible.set(false);
              this.clearFilePreview();

              this.messageService.add({
                severity: 'success',
                summary: 'Upload Complete',
                detail: roomType
                  ? `New image assigned to room type "${roomType}".`
                  : 'New hotel gallery image added successfully.',
                life: 4000,
              });

              // Refresh hotel images
              this.loadImages(hotelId);
              break;
            case 'error':
              this.uploading.set(false);
              this.uploadError.set(state.error || 'Upload failed.');
              break;
          }
        },
        error: (err) => {
          this.uploading.set(false);
          const msg = err?.message || 'Upload operation failed. Please check your connection.';
          this.uploadError.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Upload Error',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  // ── Delete Handlers ────────────────────────────────────────
  confirmDelete(image: HotelImageDto): void {
    this.imageToDelete.set(image);
    this.deleteDialogVisible.set(true);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.deleteDialogVisible.set(false);
    this.imageToDelete.set(null);
  }

  executeDelete(): void {
    const image = this.imageToDelete();
    const hotelId = this.selectedHotelId();
    if (!image || !hotelId) return;

    this.deleting.set(true);

    this.hotelImageService
      .deleteImage(image.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.imageToDelete.set(null);

          this.messageService.add({
            severity: 'success',
            summary: 'Image Deleted',
            detail: 'The image has been successfully removed.',
            life: 3500,
          });

          // Refresh the gallery
          this.loadImages(hotelId);
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = err?.message || 'Failed to delete the image.';
          this.messageService.add({
            severity: 'error',
            summary: 'Deletion Failed',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  // ── Helpers ────────────────────────────────────────────────
  formatFileSize(bytes?: number): string {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  }
}
