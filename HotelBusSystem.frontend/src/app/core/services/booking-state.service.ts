import { Injectable, computed, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { HotelDTO } from '../models/Hotel/hotel.model';
import { RoomDTO } from '../models/Room/room.model';
import { BusStopDto } from '../models/Bus/bus-stop.model';
import { BusSeatDTO } from '../models/Bus/bus-seat.model';
import { EnrichedBusTrip } from '../../features/buses/bus-search-results/bus-search-results';

export interface ChildGuestState {
  id: number;
  age: number | null;
}

export interface HotelBookingState {
  hotel: HotelDTO;
  selectedRooms: RoomDTO[];
  checkIn: string;
  checkOut: string;
  stayNights: number;
  adultsCount: number;
  children: ChildGuestState[];
  customRoomAdults?: Record<number, number>;
  customRoomChildIds?: Record<number, number[]>;
  totalHotelPrice: number;
}

export interface SelectedTripInfo {
  direction: 'outgoing' | 'return';
  trip: EnrichedBusTrip;
  selectedSeats: BusSeatDTO[];
  originStop: BusStopDto | null;
  destinationStop: BusStopDto | null;
  distanceFromHotel: number | null;
  price: number;
}

export interface TransportationBookingState {
  originBusStopId?: number | null;
  outgoing?: SelectedTripInfo | null;
  returnTrip?: SelectedTripInfo | null;
  // Legacy single trip fields:
  trip?: EnrichedBusTrip;
  selectedSeats?: BusSeatDTO[];
  originStop?: BusStopDto | null;
  destinationStop?: BusStopDto | null;
  distanceFromHotel?: number | null;
  totalBusPrice: number;
}

export interface PersistedBookingState {
  hotel: HotelBookingState | null;
  transportation: TransportationBookingState | null;
  originBusStopId?: number | null;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: ChildGuestState[];
  resumeSummaryAfterLogin?: boolean;
}

const STORAGE_KEY = 'travelease_booking_summary_state';

@Injectable({
  providedIn: 'root',
})
export class BookingStateService {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  // State signals
  readonly hotelBooking = signal<HotelBookingState | null>(null);
  readonly transportationBooking = signal<TransportationBookingState | null>(null);
  readonly originBusStopId = signal<number | null>(null);
  readonly summaryOpen = signal<boolean>(false);
  readonly hideTriggerOnPayment = signal<boolean>(false);
  readonly resumeSummaryAfterLogin = signal<boolean>(false);

  // Single Source of Truth for stay dates and guest party
  readonly checkIn = signal<string>('');
  readonly checkOut = signal<string>('');
  readonly adults = signal<number>(2);
  readonly children = signal<ChildGuestState[]>([]);

  // Cross-component notification subjects
  readonly stayDatesChanged$ = new Subject<{ checkIn: string; checkOut: string }>();
  readonly guestsChanged$ = new Subject<{ adults: number; children: ChildGuestState[] }>();

  // Computed stay nights
  readonly stayNights = computed<number | null>(() => {
    const inStr = this.checkIn().trim();
    const outStr = this.checkOut().trim();
    if (!inStr || !outStr) return null;
    const dIn = this.parseLocalDate(inStr);
    const dOut = this.parseLocalDate(outStr);
    if (!dIn || !dOut || dOut.getTime() <= dIn.getTime()) return null;
    return Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24));
  });

  // Backward-compatibility alias
  readonly isSummaryPopupOpen = this.summaryOpen;

  // Computed properties
  readonly hasHotel = computed<boolean>(() => {
    const hb = this.hotelBooking();
    return !!hb && !!hb.hotel && Array.isArray(hb.selectedRooms) && hb.selectedRooms.length > 0;
  });

  readonly hasOutgoingTrip = computed<boolean>(() => {
    const tb = this.transportationBooking();
    if (!tb) return false;
    if (tb.outgoing !== undefined) {
      return !!(tb.outgoing && tb.outgoing.selectedSeats && tb.outgoing.selectedSeats.length > 0);
    }
    return !!(tb.trip && tb.selectedSeats && tb.selectedSeats.length > 0);
  });

  readonly hasReturnTrip = computed<boolean>(() => {
    const tb = this.transportationBooking();
    return !!tb?.returnTrip && Array.isArray(tb.returnTrip.selectedSeats) && tb.returnTrip.selectedSeats.length > 0;
  });

  readonly hasTransportation = computed<boolean>(() => {
    return this.hasOutgoingTrip() || this.hasReturnTrip();
  });

  readonly hasAnySelection = computed<boolean>(() => {
    return this.hasHotel() || this.hasTransportation();
  });

  readonly hotelPrice = computed<number>(() => {
    return this.hotelBooking()?.totalHotelPrice || 0;
  });

  readonly outgoingTripPrice = computed<number>(() => {
    const tb = this.transportationBooking();
    if (tb?.outgoing) return tb.outgoing.price || 0;
    if (tb?.trip) return tb.totalBusPrice || 0;
    return 0;
  });

  readonly returnTripPrice = computed<number>(() => {
    const tb = this.transportationBooking();
    return tb?.returnTrip?.price || 0;
  });

  readonly transportationPrice = computed<number>(() => {
    const tb = this.transportationBooking();
    if (!tb) return 0;
    if (tb.outgoing || tb.returnTrip) {
      return (tb.outgoing?.price || 0) + (tb.returnTrip?.price || 0);
    }
    return tb.totalBusPrice || 0;
  });

  readonly totalCombinedPrice = computed<number>(() => {
    return this.hotelPrice() + this.transportationPrice();
  });

  readonly selectedRoomsCount = computed<number>(() => {
    return this.hotelBooking()?.selectedRooms.length || 0;
  });

  readonly selectedSeatsCount = computed<number>(() => {
    const tb = this.transportationBooking();
    if (!tb) return 0;
    let count = 0;
    if (tb.outgoing?.selectedSeats) count += tb.outgoing.selectedSeats.length;
    if (tb.returnTrip?.selectedSeats) count += tb.returnTrip.selectedSeats.length;
    if (count === 0 && tb.selectedSeats) count = tb.selectedSeats.length;
    return count;
  });

  readonly summaryItemsCount = computed<number>(() => {
    let count = this.selectedRoomsCount();
    if (this.hasOutgoingTrip()) count++;
    if (this.hasReturnTrip()) count++;
    return count;
  });

  constructor() {
    this.restoreFromStorage();
  }

  /**
   * Updates or sets hotel reservation selections in the central store.
   */
  setHotelSelection(state: HotelBookingState): void {
    if (state.checkIn) this.checkIn.set(state.checkIn);
    if (state.checkOut) this.checkOut.set(state.checkOut);
    if (state.adultsCount) this.adults.set(state.adultsCount);
    if (state.children) this.children.set(state.children);
    this.hotelBooking.set(state);
    this.persistToStorage();
  }

  /**
   * Parses local date YYYY-MM-DD into a midnight local Date object.
   */
  parseLocalDate(dateStr: string): Date | null {
    if (!dateStr || !dateStr.includes('-')) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Formats a local Date object into YYYY-MM-DD string.
   */
  formatDateToIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Returns today's date formatted as YYYY-MM-DD.
   */
  getTodayString(): string {
    return this.formatDateToIso(new Date());
  }

  /**
   * Validates stay dates against today and check-in/out order.
   */
  validateStayDates(checkIn: string, checkOut: string): { isValid: boolean; nights: number | null; error?: string } {
    const inStr = (checkIn || '').trim();
    const outStr = (checkOut || '').trim();
    if (!inStr || !outStr) {
      return { isValid: false, nights: null, error: 'Both check-in and check-out dates are required.' };
    }

    const dIn = this.parseLocalDate(inStr);
    const dOut = this.parseLocalDate(outStr);
    const today = this.parseLocalDate(this.getTodayString());

    if (!dIn || isNaN(dIn.getTime())) {
      return { isValid: false, nights: null, error: 'Invalid check-in date format.' };
    }
    if (!dOut || isNaN(dOut.getTime())) {
      return { isValid: false, nights: null, error: 'Invalid check-out date format.' };
    }

    if (today && dIn.getTime() < today.getTime()) {
      return { isValid: false, nights: null, error: 'Check-in date cannot be in the past.' };
    }

    if (dOut.getTime() <= dIn.getTime()) {
      return { isValid: false, nights: null, error: 'Check-out date must be after check-in date.' };
    }

    const nights = Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24));
    if (nights < 1) {
      return { isValid: false, nights: null, error: 'Stay must be at least 1 night.' };
    }

    return { isValid: true, nights };
  }

  /**
   * Sets stay dates in the central state after validation and notifies listeners.
   */
  setStayDates(checkIn: string, checkOut: string): { isValid: boolean; nights: number | null; error?: string } {
    const cleanIn = (checkIn || '').trim();
    const cleanOut = (checkOut || '').trim();
    if (cleanIn) this.checkIn.set(cleanIn);
    if (cleanOut) this.checkOut.set(cleanOut);

    const currentIn = this.checkIn();
    const currentOut = this.checkOut();

    const validation = this.validateStayDates(currentIn, currentOut);
    if (validation.isValid) {
      const nights = validation.nights!;
      const current = this.hotelBooking();
      if (current) {
        let totalHotelPrice = 0;
        for (const r of current.selectedRooms) {
          totalHotelPrice += (r.pricePerNight || 0) * (nights > 0 ? nights : 1);
        }
        this.hotelBooking.set({
          ...current,
          checkIn: currentIn,
          checkOut: currentOut,
          stayNights: nights,
          totalHotelPrice,
        });
      }
    }

    this.persistToStorage();
    this.stayDatesChanged$.next({ checkIn: currentIn, checkOut: currentOut });
    return validation;
  }

  /**
   * Updates stay dates if hotel selection exists or updates central dates.
   */
  updateStayDates(checkIn: string, checkOut: string, stayNights?: number): void {
    this.setStayDates(checkIn, checkOut);
  }

  /**
   * Sets total adult guests count.
   */
  setAdults(count: number): void {
    const valid = Math.max(1, count);
    this.adults.set(valid);
    const current = this.hotelBooking();
    if (current) {
      this.hotelBooking.set({ ...current, adultsCount: valid });
      this.autoDistributeGuests();
    }
    this.persistToStorage();
    this.guestsChanged$.next({ adults: valid, children: this.children() });
  }

  /**
   * Adds a new child guest. Returns assigned child id.
   */
  addChild(age: number | null = null): number {
    const list = this.children();
    const nextId = list.length > 0 ? Math.max(...list.map((c) => c.id)) + 1 : 1;
    const updated: ChildGuestState[] = [...list, { id: nextId, age }];
    this.children.set(updated);
    const current = this.hotelBooking();
    if (current) {
      this.hotelBooking.set({ ...current, children: updated });
      this.autoDistributeGuests();
    }
    this.persistToStorage();
    this.guestsChanged$.next({ adults: this.adults(), children: updated });
    return nextId;
  }

  /**
   * Removes a child guest by id.
   */
  removeChild(id: number): void {
    const updated = this.children().filter((c) => c.id !== id);
    this.children.set(updated);
    const current = this.hotelBooking();
    if (current) {
      const customChildMap = { ...(current.customRoomChildIds || {}) };
      for (const rId of Object.keys(customChildMap)) {
        customChildMap[Number(rId)] = (customChildMap[Number(rId)] || []).filter((cId) => cId !== id);
      }
      this.hotelBooking.set({ ...current, children: updated, customRoomChildIds: customChildMap });
      this.autoDistributeGuests();
    }
    this.persistToStorage();
    this.guestsChanged$.next({ adults: this.adults(), children: updated });
  }

  /**
   * Sets age for a specific child guest.
   */
  setChildAge(id: number, age: number | null): void {
    const updated = this.children().map((c) => (c.id === id ? { ...c, age } : c));
    this.children.set(updated);
    const current = this.hotelBooking();
    if (current) {
      this.hotelBooking.set({ ...current, children: updated });
    }
    this.persistToStorage();
    this.guestsChanged$.next({ adults: this.adults(), children: updated });
  }

  /**
   * Clears only hotel selections, preserving transportation if already chosen.
   */
  clearHotelSelection(): void {
    this.hotelBooking.set(null);
    this.persistToStorage();
    if (!this.hasTransportation()) {
      this.summaryOpen.set(false);
    }
  }

  /**
   * Removes a specific room from selected rooms.
   */
  removeRoomFromHotel(roomId: number): void {
    const current = this.hotelBooking();
    if (!current) return;

    const remainingRooms = current.selectedRooms.filter((r) => r.id !== roomId);
    if (remainingRooms.length === 0) {
      this.clearHotelSelection();
      return;
    }

    let totalHotelPrice = 0;
    const nights = current.stayNights > 0 ? current.stayNights : 1;
    for (const r of remainingRooms) {
      totalHotelPrice += (r.pricePerNight || 0) * nights;
    }

    this.hotelBooking.set({
      ...current,
      selectedRooms: remainingRooms,
      totalHotelPrice,
    });
    this.persistToStorage();
  }

  setOriginBusStop(originId: number | null): void {
    this.originBusStopId.set(originId);
    const current = this.transportationBooking();
    if (current) {
      this.transportationBooking.set({
        ...current,
        originBusStopId: originId,
      });
    }
    this.persistToStorage();
  }

  /**
   * Selects an outgoing bus trip with reserved seats.
   */
  selectOutgoingTrip(
    trip: EnrichedBusTrip,
    selectedSeats: BusSeatDTO[],
    originStop: BusStopDto | null,
    destinationStop: BusStopDto | null,
    distanceFromHotel: number | null = null
  ): void {
    const seatPrice = trip.price || 0;
    const price = seatPrice * selectedSeats.length;
    const outgoing: SelectedTripInfo = {
      direction: 'outgoing',
      trip,
      selectedSeats,
      originStop,
      destinationStop,
      distanceFromHotel,
      price,
    };

    const current = this.transportationBooking();
    const returnTrip = current?.returnTrip || null;
    const totalBusPrice = price + (returnTrip?.price || 0);

    this.transportationBooking.set({
      originBusStopId: this.originBusStopId() || originStop?.id || null,
      outgoing,
      returnTrip,
      // Legacy compatibility:
      trip,
      selectedSeats,
      originStop,
      destinationStop,
      distanceFromHotel,
      totalBusPrice,
    });
    this.persistToStorage();
  }

  /**
   * Selects a return bus trip with reserved seats.
   */
  selectReturnTrip(
    trip: EnrichedBusTrip,
    selectedSeats: BusSeatDTO[],
    originStop: BusStopDto | null,
    destinationStop: BusStopDto | null,
    distanceFromHotel: number | null = null
  ): void {
    const seatPrice = trip.price || 0;
    const price = seatPrice * selectedSeats.length;
    const returnTrip: SelectedTripInfo = {
      direction: 'return',
      trip,
      selectedSeats,
      originStop,
      destinationStop,
      distanceFromHotel,
      price,
    };

    const current = this.transportationBooking();
    const outgoing = current?.outgoing || null;
    const totalBusPrice = (outgoing?.price || 0) + price;

    this.transportationBooking.set({
      originBusStopId: this.originBusStopId(),
      outgoing,
      returnTrip,
      // Legacy compatibility fallback if outgoing is not set:
      trip: outgoing?.trip || trip,
      selectedSeats: outgoing?.selectedSeats || selectedSeats,
      originStop: outgoing?.originStop || originStop,
      destinationStop: outgoing?.destinationStop || destinationStop,
      distanceFromHotel: outgoing?.distanceFromHotel || distanceFromHotel,
      totalBusPrice,
    });
    this.persistToStorage();
  }

  /**
   * Removes only the outgoing bus trip selection.
   */
  removeOutgoingTrip(): void {
    const current = this.transportationBooking();
    if (!current) return;

    if (!current.returnTrip) {
      this.clearTransportationSelection();
      return;
    }

    const ret = current.returnTrip;
    this.transportationBooking.set({
      originBusStopId: current.originBusStopId,
      outgoing: null,
      returnTrip: ret,
      trip: ret.trip,
      selectedSeats: ret.selectedSeats,
      originStop: ret.originStop,
      destinationStop: ret.destinationStop,
      distanceFromHotel: ret.distanceFromHotel,
      totalBusPrice: ret.price,
    });
    this.persistToStorage();
  }

  /**
   * Removes only the return bus trip selection.
   */
  removeReturnTrip(): void {
    const current = this.transportationBooking();
    if (!current) return;

    if (!current.outgoing) {
      this.clearTransportationSelection();
      return;
    }

    const out = current.outgoing;
    this.transportationBooking.set({
      originBusStopId: current.originBusStopId,
      outgoing: out,
      returnTrip: null,
      trip: out.trip,
      selectedSeats: out.selectedSeats,
      originStop: out.originStop,
      destinationStop: out.destinationStop,
      distanceFromHotel: out.distanceFromHotel,
      totalBusPrice: out.price,
    });
    this.persistToStorage();
  }

  /**
   * Legacy method for backwards compatibility with existing single-trip flow.
   */
  setTransportationSelection(
    trip: EnrichedBusTrip,
    selectedSeats: BusSeatDTO[],
    originStop: BusStopDto | null,
    destinationStop: BusStopDto | null,
    distanceFromHotel: number | null = null
  ): void {
    this.selectOutgoingTrip(trip, selectedSeats, originStop, destinationStop, distanceFromHotel);
  }

  /**
   * Clears all transportation selections, leaving hotel booking intact.
   */
  clearTransportationSelection(): void {
    this.transportationBooking.set(null);
    this.persistToStorage();
    if (!this.hasHotel()) {
      this.summaryOpen.set(false);
    }
  }

  /**
   * Completely clears all hotel and transportation selections, resets storage.
   */
  clearAll(): void {
    this.checkIn.set('');
    this.checkOut.set('');
    this.adults.set(2);
    this.children.set([]);
    this.hotelBooking.set(null);
    this.transportationBooking.set(null);
    this.originBusStopId.set(null);
    this.summaryOpen.set(false);
    this.hideTriggerOnPayment.set(false);
    this.resumeSummaryAfterLogin.set(false);
    this.clearStorage();
    this.stayDatesChanged$.next({ checkIn: '', checkOut: '' });
    this.guestsChanged$.next({ adults: 2, children: [] });
  }

  /**
   * Convenience alias for clearAll().
   */
  clearSummary(): void {
    this.clearAll();
  }

  /**
   * Opens the booking summary drawer.
   */
  openSummary(): void {
    this.summaryOpen.set(true);
  }

  /**
   * Closes the booking summary drawer without modifying selections.
   */
  closeSummary(): void {
    this.summaryOpen.set(false);
  }

  /**
   * Sets the booking summary drawer open/closed state.
   */
  setSummaryOpen(value: boolean): void {
    this.summaryOpen.set(value);
  }

  /**
   * Toggles the booking summary drawer open/closed state.
   */
  toggleSummary(): void {
    this.summaryOpen.update((open) => !open);
  }

  // Backward compatibility aliases
  openSummaryPopup(): void {
    this.openSummary();
  }

  closeSummaryPopup(): void {
    this.closeSummary();
  }

  toggleSummaryPopup(): void {
    this.toggleSummary();
  }

  /**
   * Sets the resumeSummaryAfterLogin flag and persists state.
   */
  setResumeSummaryAfterLogin(value: boolean): void {
    this.resumeSummaryAfterLogin.set(value);
    this.persistToStorage();
  }

  /**
   * Navigates to the payment checkout flow while preserving current state.
   * If the user is unauthenticated, redirects to login with returnUrl and sets
   * resumeSummaryAfterLogin flag so the drawer reopens automatically after login.
   */
  continueToPayment(currentUrl?: string): void {
    if (!this.authService.isAuthenticated()) {
      this.setResumeSummaryAfterLogin(true);
      const returnDestination = currentUrl || this.router.url;
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: returnDestination },
      });
      return;
    }

    this.closeSummary();
    this.hideTriggerOnPayment.set(true);
    this.router.navigate(['/payment']);
  }

  // ── Guest & Room Mutation Methods ───────────────────────────
  increaseTotalAdults(): void {
    const current = this.hotelBooking();
    if (current && current.selectedRooms.length > 0) {
      const totalCapacity = current.selectedRooms.reduce((acc, r) => acc + (r.capacity || 2), 0);
      const chargeableChildren = this.children().filter((c) => c.age !== null && c.age >= 12).length;
      if (this.adults() + chargeableChildren >= totalCapacity) return;
    }
    this.setAdults(this.adults() + 1);
  }

  decreaseTotalAdults(): void {
    const current = this.hotelBooking();
    const minAdults = current && current.selectedRooms.length > 0 ? Math.max(1, current.selectedRooms.length) : 1;
    if (this.adults() <= minAdults) return;
    this.setAdults(this.adults() - 1);
  }

  increaseTotalChildren(): void {
    this.addChild(null);
  }

  decreaseTotalChildren(): void {
    const list = this.children();
    if (list.length === 0) return;
    const removedChild = list[list.length - 1];
    this.removeChild(removedChild.id);
  }

  updateRoomAdults(roomId: number, delta: number): void {
    const current = this.hotelBooking();
    if (!current) return;
    const customAdults = { ...(current.customRoomAdults || {}) };
    const currentVal = customAdults[roomId] ?? 1;
    const nextVal = currentVal + delta;
    if (nextVal < 1) return;

    customAdults[roomId] = nextVal;
    this.hotelBooking.set({
      ...current,
      customRoomAdults: customAdults,
    });
    this.persistToStorage();
  }

  addChildToRoom(roomId: number): void {
    const nextId = this.addChild(null);
    const current = this.hotelBooking();
    if (current) {
      const customChildMap = { ...(current.customRoomChildIds || {}) };
      const roomChildIds = [...(customChildMap[roomId] || []), nextId];
      customChildMap[roomId] = roomChildIds;
      this.hotelBooking.set({
        ...current,
        customRoomChildIds: customChildMap,
      });
      this.persistToStorage();
    }
  }

  removeChildFromRoom(childId: number, roomId: number): void {
    this.removeChild(childId);
  }

  updateChildAge(childId: number, age: number | null): void {
    this.setChildAge(childId, age);
  }

  autoDistributeGuests(): void {
    const current = this.hotelBooking();
    if (!current || current.selectedRooms.length === 0) return;

    const rooms = current.selectedRooms;
    const customAdults: Record<number, number> = {};
    const customChildIds: Record<number, number[]> = {};

    rooms.forEach((r) => {
      customAdults[r.id] = 1;
      customChildIds[r.id] = [];
    });

    let remainingAdults = Math.max(0, current.adultsCount - rooms.length);
    let roomIdx = 0;
    while (remainingAdults > 0) {
      const room = rooms[roomIdx % rooms.length];
      const cap = room.capacity || 2;
      if (customAdults[room.id] < cap) {
        customAdults[room.id]++;
        remainingAdults--;
      }
      roomIdx++;
      if (roomIdx > rooms.length * 10) break;
    }

    // Distribute children across rooms
    current.children.forEach((c, idx) => {
      const targetRoom = rooms[idx % rooms.length];
      customChildIds[targetRoom.id].push(c.id);
    });

    this.hotelBooking.set({
      ...current,
      customRoomAdults: customAdults,
      customRoomChildIds: customChildIds,
    });
    this.persistToStorage();
  }

  // ── Persistence Helpers ─────────────────────────────────────
  private persistToStorage(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const data: PersistedBookingState = {
        hotel: this.hotelBooking(),
        transportation: this.transportationBooking(),
        originBusStopId: this.originBusStopId(),
        checkIn: this.checkIn(),
        checkOut: this.checkOut(),
        adults: this.adults(),
        children: this.children(),
        resumeSummaryAfterLogin: this.resumeSummaryAfterLogin(),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not persist booking state to sessionStorage:', e);
    }
  }

  private restoreFromStorage(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data: PersistedBookingState = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (data.checkIn) this.checkIn.set(data.checkIn);
        if (data.checkOut) this.checkOut.set(data.checkOut);
        if (typeof data.adults === 'number' && data.adults >= 1) this.adults.set(data.adults);
        if (Array.isArray(data.children)) this.children.set(data.children);
        if (typeof data.resumeSummaryAfterLogin === 'boolean') {
          this.resumeSummaryAfterLogin.set(data.resumeSummaryAfterLogin);
        }

        // Validate hotel draft
        if (
          data.hotel &&
          data.hotel.hotel &&
          data.hotel.hotel.id &&
          Array.isArray(data.hotel.selectedRooms) &&
          data.hotel.selectedRooms.length > 0 &&
          data.hotel.checkIn &&
          data.hotel.checkOut
        ) {
          this.hotelBooking.set(data.hotel);
          if (data.hotel.checkIn) this.checkIn.set(data.hotel.checkIn);
          if (data.hotel.checkOut) this.checkOut.set(data.hotel.checkOut);
          if (data.hotel.adultsCount) this.adults.set(data.hotel.adultsCount);
          if (data.hotel.children) this.children.set(data.hotel.children);
        } else {
          this.hotelBooking.set(null);
        }

        // Validate transportation draft
        if (data.transportation && typeof data.transportation === 'object') {
          const tb = data.transportation;
          const hasValidOutgoing = !!(tb.outgoing && tb.outgoing.trip && tb.outgoing.trip.id && Array.isArray(tb.outgoing.selectedSeats));
          const hasValidReturn = !!(tb.returnTrip && tb.returnTrip.trip && tb.returnTrip.trip.id && Array.isArray(tb.returnTrip.selectedSeats));
          const hasValidLegacy = !!(tb.trip && tb.trip.id && Array.isArray(tb.selectedSeats));

          if (hasValidOutgoing || hasValidReturn || hasValidLegacy) {
            this.transportationBooking.set(tb);
          } else {
            this.transportationBooking.set(null);
          }
        }

        if (data.originBusStopId && typeof data.originBusStopId === 'number') {
          this.originBusStopId.set(data.originBusStopId);
        }
      }
    } catch (e) {
      console.warn('Could not restore booking state from sessionStorage, clearing corrupted data:', e);
      this.clearStorage();
    }
  }

  private clearStorage(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Could not remove booking state from sessionStorage:', e);
    }
  }
}
