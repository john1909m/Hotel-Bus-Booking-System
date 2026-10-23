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
import { Subject, takeUntil, forkJoin } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

// Core Models & Services
import { BusService } from '../../../core/services/bus.service';
import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { BusDTO, BusRequestDTO } from '../../../core/models/Bus/bus.model';
import { BusSeatDTO, BusSeatRequestDTO, seatType } from '../../../core/models/Bus/bus-seat.model';
import { PageBusDTO, BusListParams } from '../../../core/models/Pagination/busPage.model';

@Component({
  selector: 'app-buses-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    ToastModule,
    TagModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './buses-management.html',
  styleUrl: './buses-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusesManagement implements OnInit, OnDestroy {
  private readonly busService = inject(BusService);
  private readonly busSeatService = inject(BusSeatService);
  private readonly busBookingService = inject(BusBookingService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  readonly buses = signal<BusDTO[]>([]);
  readonly pageData = signal<PageBusDTO | null>(null);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchFilter = signal<string>('');
  readonly sortBy = signal<string>('id');
  readonly sortDirection = signal<string>('asc');
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

  // ── Bus Dialog Signals ─────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingBusId = signal<number | null>(null);

  readonly deleteDialogVisible = signal<boolean>(false);
  readonly busToDelete = signal<BusDTO | null>(null);

  // ── Bus Seats Popup Signals ────────────────────────────────
  readonly seatsDialogVisible = signal<boolean>(false);
  readonly selectedBusForSeats = signal<BusDTO | null>(null);
  readonly selectedBusId = signal<number | null>(null);
  readonly currentBusSeats = signal<BusSeatDTO[]>([]);
  readonly loadingSeats = signal<boolean>(false);
  readonly generatingSeats = signal<boolean>(false);

  readonly totalElements = computed(() => this.pageData()?.totalElements ?? 0);
  readonly firstRow = computed(() => this.currentPage() * this.pageSize());

  readonly displayedBuses = computed(() => {
    const q = this.searchFilter().trim().toLowerCase();
    const list = this.buses();
    if (!q) return list;
    return list.filter(
      (b) =>
        b.busNumber.toLowerCase().includes(q) ||
        (b.company && b.company.toLowerCase().includes(q))
    );
  });

  readonly sortedBusSeats = computed(() => {
    return [...this.currentBusSeats()].sort((a, b) => {
      const numA = parseInt(a.seatNumber, 10);
      const numB = parseInt(b.seatNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.seatNumber.localeCompare(b.seatNumber);
    });
  });

  // ── Reactive Form ──────────────────────────────────────────
  readonly busForm: FormGroup = this.fb.group({
    busNumber: ['', [Validators.required, Validators.maxLength(50)]],
    company: ['', [Validators.required, Validators.maxLength(100)]],
    capacity: [45, [Validators.required, Validators.min(1), Validators.max(120)]],
    busType: ['STANDARD', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadBuses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBuses(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: BusListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: this.sortBy(),
      sortDirection: this.sortDirection(),
    };

    this.busService
      .getAllBuses(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.buses.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load buses from backend.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Buses',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  onSearchFilter(val: string): void {
    this.searchFilter.set(val);
  }

  onSortChange(val: string): void {
    this.sortBy.set(val);
    this.currentPage.set(0);
    this.loadBuses();
  }

  onDirChange(val: string): void {
    this.sortDirection.set(val);
    this.currentPage.set(0);
    this.loadBuses();
  }

  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.currentPage.set(pageIndex);
    this.loadBuses();
  }
  onTypeChange(val: string): void{
    const id = val ? parseInt(val, 10) : null;
    this.selectedBusId.set(isNaN(id as any)? null : id);
    this.loadBuses();
  }
  // ── Seat Generation Logic ──────────────────────────────────
  determineSeatType(seatNum: number, capacity: number): seatType {
    if (seatNum <= Math.min(4, capacity)) {
      return 'PREMIUM';
    }
    const posInRow = (seatNum - 1) % 4;
    if (posInRow === 0 || posInRow === 3) {
      return 'WINDOW';
    }
    if (posInRow === 1) {
      return 'AISLE';
    }
    return 'REGULAR';
  }

  getSeatTypeSeverity(type: seatType | string): 'info' | 'warn' | 'success' | 'secondary' {
    switch (type) {
      case 'PREMIUM':
        return 'warn';
      case 'WINDOW':
        return 'info';
      case 'AISLE':
        return 'success';
      case 'REGULAR':
      default:
        return 'secondary';
    }
  }

  autoGenerateSeatsForBus(
    bus: BusDTO,
    targetCapacity: number,
    onSuccess?: (createdCount: number) => void
  ): void {
    this.generatingSeats.set(true);
    this.busSeatService
      .getBusSeatsByBusId(bus.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (existing) => {
          const existingNums = new Set(existing.map((s) => s.seatNumber));
          const toCreate: BusSeatRequestDTO[] = [];

          for (let i = 1; i <= targetCapacity; i++) {
            const sNum = String(i);
            if (!existingNums.has(sNum)) {
              toCreate.push({
                seatNumber: sNum,
                seatType: this.determineSeatType(i, targetCapacity),
                busId: bus.id,
              });
            }
          }

          if (toCreate.length === 0) {
            this.generatingSeats.set(false);
            if (onSuccess) onSuccess(0);
            return;
          }

          const requests = toCreate.map((req) => this.busSeatService.createBusSeat(req));
          forkJoin(requests)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (created) => {
                this.generatingSeats.set(false);
                if (this.selectedBusForSeats()?.id === bus.id) {
                  this.loadSeatsForBus(bus);
                }
                if (onSuccess) onSuccess(created.length);
              },
              error: (err) => {
                this.generatingSeats.set(false);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Seat Generation Error',
                  detail: err?.message || 'Failed to generate seats for bus.',
                  life: 5000,
                });
              },
            });
        },
        error: (err) => {
          this.generatingSeats.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Seat Inspection Error',
            detail: err?.message || 'Failed to inspect current bus seats.',
            life: 5000,
          });
        },
      });
  }

  // ── Create & Edit Handlers ─────────────────────────────────
  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.editingBusId.set(null);
    this.busForm.reset({
      busNumber: '',
      company: '',
      capacity: 45,
      busType: 'STANDARD',
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(bus: BusDTO): void {
    this.isEditMode.set(true);
    this.editingBusId.set(bus.id);
    this.busForm.patchValue({
      busNumber: bus.busNumber,
      company: bus.company,
      capacity: bus.capacity,
      busType: bus.busType || 'STANDARD',
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.busForm.reset();
  }

  saveBus(): void {
    if (this.busForm.invalid) {
      this.busForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please check the required fields in the form.',
        life: 4000,
      });
      return;
    }

    this.saving.set(true);
    const formVal = this.busForm.getRawValue();

    const payload: BusRequestDTO = {
      busNumber: String(formVal.busNumber).trim(),
      company: String(formVal.company).trim(),
      capacity: Number(formVal.capacity),
      busType: String(formVal.busType).trim(),
    };

    if (this.isEditMode()) {
      const id = this.editingBusId();
      if (!id) {
        this.saving.set(false);
        return;
      }

      this.busService
        .updateBus(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            const newCap = updated.capacity;
            // Inspect existing seats for synchronization
            this.busSeatService
              .getBusSeatsByBusId(id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (seats) => {
                  if (newCap > seats.length) {
                    // Capacity increased: generate additional missing seats
                    this.autoGenerateSeatsForBus(updated, newCap, (createdCount) => {
                      this.saving.set(false);
                      this.dialogVisible.set(false);
                      this.messageService.add({
                        severity: 'success',
                        summary: 'Bus & Seats Updated',
                        detail: `Bus "${updated.busNumber}" updated and ${createdCount} additional seats generated.`,
                        life: 4500,
                      });
                      this.loadBuses();
                    });
                  } else if (newCap < seats.length) {
                    // Capacity decreased: check booking constraints before deleting
                    this.busBookingService
                      .getAllBusBookings({ size: 1000 })
                      .pipe(takeUntil(this.destroy$))
                      .subscribe({
                        next: (page) => {
                          const allBookings = page.content || [];
                          const activeBookings = allBookings.filter((b) => b.status !== 'CANCELLED');
                          const bookedSeatIds = new Set(activeBookings.map((b) => b.seatId));

                          // Sort current seats numerically descending
                          const sortedSeats = [...seats].sort((a, b) => {
                            const numA = parseInt(a.seatNumber, 10) || 0;
                            const numB = parseInt(b.seatNumber, 10) || 0;
                            return numB - numA;
                          });

                          const excessCount = seats.length - newCap;
                          const candidateSeats = sortedSeats.slice(0, excessCount);
                          const bookedCandidates = candidateSeats.filter((s) => bookedSeatIds.has(s.id));

                          if (bookedCandidates.length > 0) {
                            // Do not silently delete booked seats!
                            this.saving.set(false);
                            this.dialogVisible.set(false);
                            const bookedNums = bookedCandidates.map((s) => `Seat #${s.seatNumber}`).join(', ');
                            this.messageService.add({
                              severity: 'warn',
                              summary: 'Capacity Updated (Seats Preserved)',
                              detail: `Bus capacity updated to ${newCap}, but ${bookedNums} could not be removed due to active passenger bookings.`,
                              life: 6000,
                            });
                            this.loadBuses();
                          } else {
                            // Safely delete unbooked excess seats
                            const deleteReqs = candidateSeats.map((s) =>
                              this.busSeatService.deleteBusSeat(s.id)
                            );
                            forkJoin(deleteReqs)
                              .pipe(takeUntil(this.destroy$))
                              .subscribe({
                                next: () => {
                                  this.saving.set(false);
                                  this.dialogVisible.set(false);
                                  this.messageService.add({
                                    severity: 'success',
                                    summary: 'Bus & Seats Synchronized',
                                    detail: `Bus "${updated.busNumber}" updated to ${newCap} seats (${candidateSeats.length} excess seats removed).`,
                                    life: 4500,
                                  });
                                  this.loadBuses();
                                },
                                error: (err) => {
                                  this.saving.set(false);
                                  this.dialogVisible.set(false);
                                  this.messageService.add({
                                    severity: 'warn',
                                    summary: 'Bus Updated (Seat Deletion Warning)',
                                    detail: `Bus updated, but encountered error removing excess seats: ${err?.message || 'Error'}`,
                                    life: 5000,
                                  });
                                  this.loadBuses();
                                },
                              });
                          }
                        },
                        error: () => {
                          // Could not verify bookings safely -> preserve data
                          this.saving.set(false);
                          this.dialogVisible.set(false);
                          this.messageService.add({
                            severity: 'warn',
                            summary: 'Capacity Updated (Seats Preserved)',
                            detail: `Bus capacity updated to ${newCap}, but seats were preserved because bookings could not be verified.`,
                            life: 5000,
                          });
                          this.loadBuses();
                        },
                      });
                  } else {
                    // Capacity unchanged
                    this.saving.set(false);
                    this.dialogVisible.set(false);
                    this.messageService.add({
                      severity: 'success',
                      summary: 'Bus Updated',
                      detail: `Bus "${updated.busNumber}" has been updated.`,
                      life: 4000,
                    });
                    this.loadBuses();
                  }
                },
                error: () => {
                  this.saving.set(false);
                  this.dialogVisible.set(false);
                  this.messageService.add({
                    severity: 'success',
                    summary: 'Bus Updated',
                    detail: `Bus "${updated.busNumber}" has been updated.`,
                    life: 4000,
                  });
                  this.loadBuses();
                },
              });
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to update bus.';
            this.messageService.add({
              severity: 'error',
              summary: 'Update Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    } else {
      // Create new Bus and automatically generate seats based on capacity
      this.busService
        .createBus(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.autoGenerateSeatsForBus(created, created.capacity, (createdCount) => {
              this.saving.set(false);
              this.dialogVisible.set(false);
              this.messageService.add({
                severity: 'success',
                summary: 'Bus & Seats Created',
                detail: `Bus "${created.busNumber}" created and ${createdCount} seats generated.`,
                life: 4500,
              });
              this.currentPage.set(0);
              this.loadBuses();
            });
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to create bus.';
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
  openDeleteDialog(bus: BusDTO): void {
    this.busToDelete.set(bus);
    this.deleteDialogVisible.set(true);
  }

  closeDeleteDialog(): void {
    this.deleteDialogVisible.set(false);
    this.busToDelete.set(null);
  }

  confirmDeleteBus(): void {
    const bus = this.busToDelete();
    if (!bus) return;

    this.deleting.set(true);
    this.busService
      .deleteBus(bus.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.busToDelete.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Bus Deleted',
            detail: `Bus "${bus.busNumber}" has been removed.`,
            life: 4000,
          });

          if (this.buses().length === 1 && this.currentPage() > 0) {
            this.currentPage.update((p) => p - 1);
          }
          this.loadBuses();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = err?.message || 'Failed to delete bus.';
          this.messageService.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  // ── Seats Popup Handlers ───────────────────────────────────
  openSeatsDialog(bus: BusDTO): void {
    this.selectedBusForSeats.set(bus);
    this.seatsDialogVisible.set(true);
    this.loadSeatsForBus(bus);
  }

  loadSeatsForBus(bus: BusDTO): void {
    this.loadingSeats.set(true);
    this.busSeatService
      .getBusSeatsByBusId(bus.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (seats) => {
          this.currentBusSeats.set(Array.isArray(seats) ? seats : []);
          this.loadingSeats.set(false);
        },
        error: (err) => {
          this.currentBusSeats.set([]);
          this.loadingSeats.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Seats',
            detail: err?.message || 'Could not load seats for this bus.',
            life: 4000,
          });
        },
      });
  }

  autoGenerateSeatsForCurrentBus(): void {
    const bus = this.selectedBusForSeats();
    if (!bus) return;

    this.autoGenerateSeatsForBus(bus, bus.capacity, (count) => {
      this.messageService.add({
        severity: 'success',
        summary: 'Seats Generated',
        detail: `Successfully generated ${count} seats for bus "${bus.busNumber}".`,
        life: 4000,
      });
      this.loadSeatsForBus(bus);
    });
  }

  closeSeatsDialog(): void {
    this.seatsDialogVisible.set(false);
    this.selectedBusForSeats.set(null);
    this.currentBusSeats.set([]);
  }
}
