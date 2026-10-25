import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  computed,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { HotelDTO } from '../../../../core/models/Hotel/hotel.model';
import { RoomDTO, roomType } from '../../../../core/models/Room/room.model';
import { ChildGuest } from '../hotel-details';

@Component({
  selector: 'app-hotel-booking-summary',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    RouterLink,
    DrawerModule,
    ButtonModule,
    TagModule,
  ],
  templateUrl: './hotel-booking-summary.component.html',
  styleUrl: './hotel-booking-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelBookingSummaryComponent {
  // ── Inputs ──────────────────────────────────────────────────
  @Input() visible = false;
  @Input() hotel: HotelDTO | null = null;
  @Input() selectedRooms: RoomDTO[] = [];
  @Input() checkIn = '';
  @Input() checkOut = '';
  @Input() stayNights: number | null = null;
  @Input() formattedCheckIn: string | null = null;
  @Input() formattedCheckOut: string | null = null;
  @Input() adultsCount = 2;
  @Input() customRoomAdults: Record<number, number> = {};
  @Input() customRoomChildIds: Record<number, number[]> = {};
  @Input() children: ChildGuest[] = [];
  @Input() totalNightlyRate = 0;
  @Input() totalStayCost: number | null = null;
  @Input() isEditMode = false;
  @Input() editingBookingId: number | null = null;
  @Input() isSubmitting = false;
  @Input() errorMessage: string | null = null;
  @Input() errorStatus: number | null = null;
  @Input() isAuthenticated = false;
  @Input() currentUrl = '';
  @Input() validationErrors: string[] = [];
  @Input() canSubmit = false;

  // ── Outputs ─────────────────────────────────────────────────
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() roomAdultsChange = new EventEmitter<{ roomId: number; delta: number }>();
  @Output() addChildToRoom = new EventEmitter<number>();
  @Output() removeChildFromRoom = new EventEmitter<{ childId: number; roomId: number }>();
  @Output() childAgeChange = new EventEmitter<{ childId: number; age: number | null }>();
  @Output() removeRoom = new EventEmitter<number>();
  @Output() autoDistribute = new EventEmitter<void>();
  @Output() changeDatesRequest = new EventEmitter<void>();
  @Output() submitBooking = new EventEmitter<void>();

  readonly availableChildAges: readonly number[] = Array.from({ length: 18 }, (_, i) => i);

  // ── Helpers ────────────────────────────────────────────────
  onDrawerVisibleChange(val: boolean): void {
    this.visible = val;
    this.visibleChange.emit(val);
  }

  closeDrawer(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onChangeDates(): void {
    this.closeDrawer();
    this.changeDatesRequest.emit();
  }

  getRoomAdults(roomId: number): number {
    const custom = this.customRoomAdults[roomId];
    if (custom !== undefined) return custom;
    const count = this.selectedRooms.length;
    if (count <= 1) return this.adultsCount;
    const idx = this.selectedRooms.findIndex((r) => r.id === roomId);
    if (idx === -1) return 1;
    const total = this.adultsCount;
    const base = Math.floor(total / count);
    const rem = total % count;
    return Math.max(1, base + (idx < rem ? 1 : 0));
  }

  getRoomChildren(roomId: number): ChildGuest[] {
    const ids = this.customRoomChildIds[roomId];
    if (ids !== undefined) {
      return this.children.filter((c) => ids.includes(c.id));
    }
    const count = this.selectedRooms.length;
    if (count <= 1) {
      return [...this.children];
    }
    const idx = this.selectedRooms.findIndex((r) => r.id === roomId);
    if (idx === -1) return [];
    return this.children.filter((_, i) => i % count === idx);
  }

  getRoomCapacityChildren(roomId: number): number {
    return this.getRoomChildren(roomId).filter(
      (c) => c.age !== null && c.age !== undefined && c.age >= 12 && c.age <= 17
    ).length;
  }

  getRoomRequiredCapacity(roomId: number): number {
    return this.getRoomAdults(roomId) + this.getRoomCapacityChildren(roomId);
  }

  isRoomOverCapacity(room: RoomDTO): boolean {
    return this.getRoomRequiredCapacity(room.id) > (room.capacity || 0);
  }

  getRoomStayCost(room: RoomDTO): number | null {
    if (this.stayNights === null || this.stayNights <= 0 || !room.pricePerNight) return null;
    return room.pricePerNight * this.stayNights;
  }

  onIncreaseAdults(roomId: number): void {
    this.roomAdultsChange.emit({ roomId, delta: 1 });
  }

  onDecreaseAdults(roomId: number): void {
    if (this.getRoomAdults(roomId) > 1) {
      this.roomAdultsChange.emit({ roomId, delta: -1 });
    }
  }

  onAddChild(roomId: number): void {
    this.addChildToRoom.emit(roomId);
  }

  onRemoveChild(childId: number, roomId: number): void {
    this.removeChildFromRoom.emit({ childId, roomId });
  }

  onChildAgeSelected(childId: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value;
    const age = val === '' ? null : parseInt(val, 10);
    this.childAgeChange.emit({ childId, age: age !== null && !isNaN(age) ? age : null });
  }

  onRemoveRoom(roomId: number): void {
    this.removeRoom.emit(roomId);
  }

  onSubmit(): void {
    this.submitBooking.emit();
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
}
