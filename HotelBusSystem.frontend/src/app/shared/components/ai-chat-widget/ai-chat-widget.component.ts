import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  HostListener,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, of, catchError } from 'rxjs';

import { AiChatService } from '../../../core/services/ai-chat.service';
import { AiService } from '../../../core/services/ai.service';
import { RoomService } from '../../../core/services/room.service';
import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { AuthService } from '../../../core/services/auth.service';

import {
  HotelDto,
  BusTripInfoDto,
  RoomDto as AiRoomDto
} from '../../../core/models/AI Assistant/AIChat.model';
import { RoomDTO } from '../../../core/models/Room/room.model';
import {
  BookingDraftRequest,
  BookingDraftResponse
} from '../../../core/models/AI Assistant/BookingDraft.model';
import { BusSeatDTO } from '../../../core/models/Bus/bus-seat.model';
import { BusBookingDTO, BusBookingRequestDTO } from '../../../core/models/Bus/bus-booking.model';
import { extractErrorMessage } from '../../../../utils/ErrorHandling';

export interface InChatHotelBooking {
  step: 'dates' | 'rooms' | 'summary' | 'confirmed';
  hotel: HotelDto;
  checkIn: string;
  checkOut: string;
  adults: number;
  childCount: number;
  childAges: number[];
  availableRooms: RoomDTO[];
  selectedRoom: RoomDTO | null;
  draft: BookingDraftResponse | null;
  confirmedBooking: BookingDraftResponse | null;
  loading: boolean;
  error: string | null;
}

export interface InChatBusBooking {
  step: 'seats' | 'summary' | 'confirmed';
  trip: any;
  allSeats: BusSeatDTO[];
  bookedSeatIds: Set<number>;
  selectedSeat: BusSeatDTO | null;
  loading: boolean;
  error: string | null;
  confirmedBooking: BusBookingDTO | null;
}

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ai-chat-widget.component.html',
  styleUrl: './ai-chat-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatWidgetComponent implements OnInit, AfterViewChecked {
  protected readonly aiChatService = inject(AiChatService);
  protected readonly aiService = inject(AiService);
  protected readonly roomService = inject(RoomService);
  protected readonly busSeatService = inject(BusSeatService);
  protected readonly busBookingService = inject(BusBookingService);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') private messageInput?: ElementRef<HTMLTextAreaElement>;

  readonly isOpen = signal<boolean>(false);
  readonly currentInput = signal<string>('');
  private shouldScrollToBottom = false;

  // In-Chat Booking Flows
  readonly hotelBookingState = signal<InChatHotelBooking | null>(null);
  readonly busBookingState = signal<InChatBusBooking | null>(null);

  readonly suggestedPrompts: string[] = [
    '🏨 Find hotels in Cairo under 2000 EGP',
    '🚌 Bus trips from Cairo to Alexandria',
    '🏖️ Top resorts in Sharm El Sheikh',
    '📋 Where can I view my bookings?'
  ];

  ngOnInit(): void {
    if (this.authService.isAuthenticated() && !this.aiChatService.isMockMode()) {
      this.aiChatService.loadConversationHistory().subscribe({
        next: () => {
          this.shouldScrollToBottom = true;
        }
      });
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  toggleOpen(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.shouldScrollToBottom = true;
      setTimeout(() => this.focusInput(), 150);

      if (this.authService.isAuthenticated() && !this.aiChatService.isMockMode()) {
        this.aiChatService.loadConversationHistory().subscribe({
          next: () => {
            this.shouldScrollToBottom = true;
          }
        });
      }
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  clearHistory(): void {
    this.aiChatService.clearConversation();
    this.cancelHotelBooking();
    this.cancelBusBooking();
    this.shouldScrollToBottom = true;
  }

  toggleMockMode(): void {
    this.aiChatService.toggleMockMode();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    const text = this.currentInput().trim();
    if (!text || this.aiChatService.isLoading()) return;

    if (!this.aiChatService.isMockMode() && !this.authService.isAuthenticated()) {
      return;
    }

    this.currentInput.set('');
    this.shouldScrollToBottom = true;

    this.aiChatService.sendMessage(text).subscribe({
      next: () => {
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.shouldScrollToBottom = true;
      }
    });
  }

  sendSuggested(prompt: string): void {
    this.currentInput.set(prompt);
    this.send();
  }

  appendChipText(text: string): void {
    const current = this.currentInput();
    const updated = current ? `${current} ${text}` : text;
    this.currentInput.set(updated);
    this.focusInput();
  }

  retry(): void {
    const retryObs = this.aiChatService.retryLastMessage();
    if (retryObs) {
      this.shouldScrollToBottom = true;
      retryObs.subscribe({
        next: () => { this.shouldScrollToBottom = true; },
        error: () => { this.shouldScrollToBottom = true; }
      });
    }
  }

  redirectToLogin(): void {
    this.isOpen.set(false);
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  // ─── AI Message Formatting ───────────────────────────────────

  formatMessageText(text: string, hasResults = false): string {
    if (!text) return '';

    // 1. Strip raw markdown bold & italic asterisks (**bold** -> bold, *italic* -> italic)
    let cleaned = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');

    // 2. Clean markdown heading hashes (### Heading -> Heading)
    cleaned = cleaned.replace(/^#{1,4}\s+/gm, '');

    // 3. Format list bullets to clean Unicode bullets
    cleaned = cleaned.replace(/^[\*\-]\s+/gm, '• ');

    // 4. If structured cards are present, remove excessive trailing duplicate lines
    if (hasResults) {
      const lines = cleaned.split('\n');
      if (lines.length > 8) {
        // Keep initial informative paragraphs and trim raw repetitive listing
        cleaned = lines.slice(0, 8).join('\n') + '\n\nSee full details and booking options below:';
      }
    }

    return cleaned.trim();
  }

  // ─── Data Access Helpers ─────────────────────────────────────

  getHotelList(data: any): HotelDto[] {
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  }

  getBusTripList(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.outgoingTrips || data.returnTrips) {
      const list: any[] = [];
      if (Array.isArray(data.outgoingTrips)) list.push(...data.outgoingTrips);
      if (Array.isArray(data.returnTrips)) list.push(...data.returnTrips);
      return list;
    }
    return [data];
  }

  getRoomList(data: any): AiRoomDto[] {
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  }

  getTripOrigin(trip: any): string {
    return trip?.originCity || trip?.originStopName || 'Origin';
  }

  getTripDestination(trip: any): string {
    return trip?.destinationCity || trip?.destinationStopName || 'Destination';
  }

  getBusSearchParams(trip: any): Record<string, string> {
    const params: Record<string, string> = {};
    if (trip?.originCity) {
      params['origin'] = trip.originCity;
    }
    if (trip?.destinationCity) {
      params['destination'] = trip.destinationCity;
    }
    if (trip?.departureTime) {
      const datePart = String(trip.departureTime).split('T')[0];
      if (datePart && datePart.length === 10) {
        params['departureDate'] = datePart;
      }
    }
    return params;
  }

  getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  getTomorrowDateString(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  getDayAfterTomorrowDateString(): string {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }

  // ─── Interactive Hotel Booking ───────────────────────────────

  startHotelBooking(hotel: HotelDto): void {
    if (!this.aiChatService.isMockMode() && !this.authService.isAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    const checkIn = this.getTomorrowDateString();
    const checkOut = this.getDayAfterTomorrowDateString();

    this.hotelBookingState.set({
      step: 'dates',
      hotel,
      checkIn,
      checkOut,
      adults: 2,
      childCount: 0,
      childAges: [],
      availableRooms: [],
      selectedRoom: null,
      draft: null,
      confirmedBooking: null,
      loading: false,
      error: null,
    });
    this.shouldScrollToBottom = true;
  }

  cancelHotelBooking(): void {
    this.hotelBookingState.set(null);
  }

  setHotelCheckIn(date: string): void {
    this.hotelBookingState.update((s) => {
      if (!s) return null;
      let nextCheckOut = s.checkOut;
      if (nextCheckOut <= date) {
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        nextCheckOut = d.toISOString().split('T')[0];
      }
      return { ...s, checkIn: date, checkOut: nextCheckOut, error: null };
    });
  }

  setHotelCheckOut(date: string): void {
    this.hotelBookingState.update((s) => (s ? { ...s, checkOut: date, error: null } : null));
  }

  setHotelAdults(adults: number): void {
    const val = Math.max(1, Math.min(10, adults));
    this.hotelBookingState.update((s) => (s ? { ...s, adults: val, error: null } : null));
  }

  setHotelChildCount(count: number): void {
    const val = Math.max(0, Math.min(4, count));
    this.hotelBookingState.update((s) => {
      if (!s) return null;
      const ages = [...s.childAges];
      if (ages.length < val) {
        while (ages.length < val) ages.push(6);
      } else if (ages.length > val) {
        ages.splice(val);
      }
      return { ...s, childCount: val, childAges: ages, error: null };
    });
  }

  setHotelChildAge(index: number, age: number): void {
    this.hotelBookingState.update((s) => {
      if (!s) return null;
      const ages = [...s.childAges];
      ages[index] = age;
      return { ...s, childAges: ages };
    });
  }

  async loadHotelRooms(): Promise<void> {
    const s = this.hotelBookingState();
    if (!s) return;

    if (!s.checkIn || !s.checkOut) {
      this.hotelBookingState.update((curr) => (curr ? { ...curr, error: 'Please select both check-in and check-out dates.' } : null));
      return;
    }
    if (s.checkIn < this.getTodayDateString()) {
      this.hotelBookingState.update((curr) => (curr ? { ...curr, error: 'Check-in date cannot be in the past.' } : null));
      return;
    }
    if (s.checkOut <= s.checkIn) {
      this.hotelBookingState.update((curr) => (curr ? { ...curr, error: 'Check-out date must be after check-in date.' } : null));
      return;
    }

    this.hotelBookingState.update((curr) => (curr ? { ...curr, loading: true, error: null } : null));

    try {
      let rooms: RoomDTO[] = [];
      if (this.aiChatService.isMockMode()) {
        rooms = [
          {
            id: 201,
            roomNumber: '101',
            roomType: 'DELUXE' as any,
            capacity: 2,
            pricePerNight: s.hotel.minPrice || 1600,
            hotelId: s.hotel.id,
            hotelName: s.hotel.name,
          },
          {
            id: 202,
            roomNumber: '205',
            roomType: 'SUITE' as any,
            capacity: 4,
            pricePerNight: (s.hotel.minPrice || 1600) + 800,
            hotelId: s.hotel.id,
            hotelName: s.hotel.name,
          },
          {
            id: 203,
            roomNumber: '310',
            roomType: 'STANDARD' as any,
            capacity: 2,
            pricePerNight: s.hotel.minPrice || 1350,
            hotelId: s.hotel.id,
            hotelName: s.hotel.name,
          }
        ];
      } else {
        rooms = await firstValueFrom(
          this.roomService.getRoomsByHotelId(s.hotel.id).pipe(
            catchError((err) => {
              console.error('Failed to load hotel rooms:', err);
              return of([]);
            })
          )
        );
      }

      // Filter rooms matching capacity for adults
      const suitable = rooms.filter((r) => r.capacity >= s.adults);
      const list = suitable.length > 0 ? suitable : rooms;

      this.hotelBookingState.update((curr) =>
        curr
          ? {
              ...curr,
              availableRooms: list,
              selectedRoom: list.length > 0 ? list[0] : null,
              step: 'rooms',
              loading: false,
              error: list.length === 0 ? 'No rooms available for the selected guest count.' : null,
            }
          : null
      );
      this.shouldScrollToBottom = true;
    } catch (err) {
      this.hotelBookingState.update((curr) =>
        curr ? { ...curr, loading: false, error: extractErrorMessage(err, 'Failed to fetch rooms.') } : null
      );
    }
  }

  selectHotelRoom(room: RoomDTO): void {
    this.hotelBookingState.update((s) => (s ? { ...s, selectedRoom: room, error: null } : null));
  }

  async createHotelBookingDraft(): Promise<void> {
    const s = this.hotelBookingState();
    if (!s || !s.selectedRoom) return;

    this.hotelBookingState.update((curr) => (curr ? { ...curr, loading: true, error: null } : null));

    const checkInDate = new Date(s.checkIn);
    const checkOutDate = new Date(s.checkOut);
    const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

    if (this.aiChatService.isMockMode()) {
      const pricePerNight = s.selectedRoom.pricePerNight || 1500;
      const hotelTotal = pricePerNight * nights;
      const mockDraft: BookingDraftResponse = {
        id: Math.floor(Math.random() * 9000) + 1000,
        status: 'CREATED',
        expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
        hotelId: s.hotel.id,
        hotelName: s.hotel.name,
        roomId: s.selectedRoom.id,
        roomNumber: s.selectedRoom.roomNumber,
        roomType: String(s.selectedRoom.roomType),
        roomCapacity: s.selectedRoom.capacity,
        pricePerNight,
        checkInDate: s.checkIn,
        checkOutDate: s.checkOut,
        nights,
        adults: s.adults,
        childAges: s.childAges,
        guests: s.adults + s.childAges.length,
        hotelTotal,
        totalPrice: hotelTotal,
      };

      this.hotelBookingState.update((curr) =>
        curr ? { ...curr, draft: mockDraft, step: 'summary', loading: false } : null
      );
      this.shouldScrollToBottom = true;
      return;
    }

    const payload: BookingDraftRequest = {
      hotelId: s.hotel.id,
      roomId: s.selectedRoom.id,
      checkInDate: s.checkIn,
      checkOutDate: s.checkOut,
      adults: s.adults,
      childAges: s.childAges,
    };

    try {
      const response = await firstValueFrom(this.aiService.createBookingDraft(payload));
      this.hotelBookingState.update((curr) =>
        curr ? { ...curr, draft: response, step: 'summary', loading: false } : null
      );
      this.shouldScrollToBottom = true;
    } catch (err) {
      this.hotelBookingState.update((curr) =>
        curr ? { ...curr, loading: false, error: extractErrorMessage(err, 'Failed to create booking draft.') } : null
      );
    }
  }

  async confirmHotelBooking(): Promise<void> {
    const s = this.hotelBookingState();
    if (!s || !s.draft) return;

    this.hotelBookingState.update((curr) => (curr ? { ...curr, loading: true, error: null } : null));

    if (this.aiChatService.isMockMode()) {
      const confirmed: BookingDraftResponse = {
        ...s.draft,
        status: 'CONFIRMED',
        bookingId: Math.floor(Math.random() * 8000) + 1000,
      };

      this.hotelBookingState.update((curr) =>
        curr ? { ...curr, confirmedBooking: confirmed, step: 'confirmed', loading: false } : null
      );

      // Append confirmation to chat
      this.aiChatService.messages.update((list) => [
        ...list,
        {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          sender: 'assistant',
          text: `🎉 Your hotel booking at ${confirmed.hotelName} has been confirmed! Reference: #${confirmed.bookingId}. Room: ${confirmed.roomType} (${confirmed.checkInDate} to ${confirmed.checkOutDate}).`,
          timestamp: new Date(),
          isMock: true,
        }
      ]);
      this.shouldScrollToBottom = true;
      return;
    }

    try {
      const response = await firstValueFrom(
        this.aiService.confirmBookingDraft(s.draft.id, crypto.randomUUID ? crypto.randomUUID() : undefined)
      );

      this.hotelBookingState.update((curr) =>
        curr ? { ...curr, confirmedBooking: response, step: 'confirmed', loading: false } : null
      );

      this.aiChatService.messages.update((list) => [
        ...list,
        {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          sender: 'assistant',
          text: `🎉 Hotel booking confirmed successfully! Reference: #${response.bookingId || response.id} at ${response.hotelName}. Check-in: ${response.checkInDate}.`,
          timestamp: new Date(),
          isMock: false,
        }
      ]);
      this.shouldScrollToBottom = true;
    } catch (err) {
      this.hotelBookingState.update((curr) =>
        curr ? { ...curr, loading: false, error: extractErrorMessage(err, 'Booking confirmation failed.') } : null
      );
    }
  }

  editHotelBookingDates(): void {
    this.hotelBookingState.update((s) => (s ? { ...s, step: 'dates', error: null } : null));
  }

  editHotelBookingRoom(): void {
    this.hotelBookingState.update((s) => (s ? { ...s, step: 'rooms', error: null } : null));
  }

  // ─── Interactive Bus Booking ─────────────────────────────────

  async startBusBooking(trip: any): Promise<void> {
    if (!this.aiChatService.isMockMode() && !this.authService.isAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    this.busBookingState.set({
      step: 'seats',
      trip,
      allSeats: [],
      bookedSeatIds: new Set(),
      selectedSeat: null,
      loading: true,
      error: null,
      confirmedBooking: null,
    });
    this.shouldScrollToBottom = true;

    if (this.aiChatService.isMockMode()) {
      const mockSeats: BusSeatDTO[] = [];
      for (let i = 1; i <= 20; i++) {
        mockSeats.push({
          id: i,
          seatNumber: `${Math.ceil(i / 2)}${i % 2 === 1 ? 'A' : 'B'}`,
          seatType: 'REGULAR',
          busId: trip.busId || 1,
        });
      }
      const mockBooked = new Set<number>([2, 5, 8, 14]);

      this.busBookingState.update((curr) =>
        curr ? { ...curr, allSeats: mockSeats, bookedSeatIds: mockBooked, loading: false } : null
      );
      return;
    }

    try {
      const busId = trip.busId || trip.id;
      const seats = await firstValueFrom(
        this.busSeatService.getBusSeatsByBusId(busId).pipe(
          catchError((err) => {
            console.error('Failed to load bus seats:', err);
            return of([] as BusSeatDTO[]);
          })
        )
      );

      const tripId = trip.id || trip.tripId;
      const bookedSet = new Set<number>();
      try {
        const bookingsPage = await firstValueFrom(
          this.busBookingService.getBusBookingsByBusTripId(tripId, { size: 100 }).pipe(
            catchError(() => of({ content: [] }))
          )
        );
        if (bookingsPage && bookingsPage.content) {
          bookingsPage.content.forEach((b: any) => {
            if (b.seatId && b.status !== 'CANCELLED') {
              bookedSet.add(b.seatId);
            }
          });
        }
      } catch {
        // Bookings query failed, keep empty bookedSet
      }

      this.busBookingState.update((curr) =>
        curr
          ? {
              ...curr,
              allSeats: seats,
              bookedSeatIds: bookedSet,
              loading: false,
              error: seats.length === 0 ? 'No seat map found for this trip.' : null,
            }
          : null
      );
    } catch (err) {
      this.busBookingState.update((curr) =>
        curr ? { ...curr, loading: false, error: extractErrorMessage(err, 'Failed to load seats.') } : null
      );
    }
  }

  cancelBusBooking(): void {
    this.busBookingState.set(null);
  }

  selectBusSeat(seat: BusSeatDTO): void {
    const s = this.busBookingState();
    if (!s || s.bookedSeatIds.has(seat.id)) return;
    this.busBookingState.update((curr) => (curr ? { ...curr, selectedSeat: seat, error: null } : null));
  }

  proceedToBusSummary(): void {
    const s = this.busBookingState();
    if (!s || !s.selectedSeat) {
      this.busBookingState.update((curr) => (curr ? { ...curr, error: 'Please choose an available seat.' } : null));
      return;
    }
    this.busBookingState.update((curr) => (curr ? { ...curr, step: 'summary', error: null } : null));
    this.shouldScrollToBottom = true;
  }

  editBusSeatSelection(): void {
    this.busBookingState.update((s) => (s ? { ...s, step: 'seats', error: null } : null));
  }

  async confirmBusBooking(): Promise<void> {
    const s = this.busBookingState();
    if (!s || !s.selectedSeat) return;

    this.busBookingState.update((curr) => (curr ? { ...curr, loading: true, error: null } : null));

    if (this.aiChatService.isMockMode()) {
      const mockBooking: BusBookingDTO = {
        id: Math.floor(Math.random() * 4000) + 100,
        bookingDate: this.getTodayDateString(),
        status: 'CONFIRMED' as any,
        price: s.trip.price || 220,
        userId: this.authService.currentUser()?.id || 1,
        busTripId: s.trip.id || 101,
        seatId: s.selectedSeat.id,
      };

      this.busBookingState.update((curr) =>
        curr ? { ...curr, confirmedBooking: mockBooking, step: 'confirmed', loading: false } : null
      );

      this.aiChatService.messages.update((list) => [
        ...list,
        {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          sender: 'assistant',
          text: `🎟️ Bus booking confirmed! Ticket #${mockBooking.id} for Seat ${s.selectedSeat?.seatNumber} (${this.getTripOrigin(s.trip)} ➔ ${this.getTripDestination(s.trip)}).`,
          timestamp: new Date(),
          isMock: true,
        }
      ]);
      this.shouldScrollToBottom = true;
      return;
    }

    const payload: BusBookingRequestDTO = {
      bookingDate: this.getTodayDateString(),
      status: 'PENDING' as any,
      price: s.trip.price,
      userId: this.authService.currentUser()!.id,
      busTripId: s.trip.id || s.trip.tripId,
      seatId: s.selectedSeat.id,
    };

    try {
      const response = await firstValueFrom(this.busBookingService.createBusBooking(payload));

      this.busBookingState.update((curr) =>
        curr ? { ...curr, confirmedBooking: response, step: 'confirmed', loading: false } : null
      );

      this.aiChatService.messages.update((list) => [
        ...list,
        {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          sender: 'assistant',
          text: `🎟️ Bus booking confirmed! Reference: #${response.id} for Seat ${s.selectedSeat?.seatNumber}. Safe travels!`,
          timestamp: new Date(),
          isMock: false,
        }
      ]);
      this.shouldScrollToBottom = true;
    } catch (err) {
      this.busBookingState.update((curr) =>
        curr ? { ...curr, loading: false, error: extractErrorMessage(err, 'Failed to confirm bus booking.') } : null
      );
    }
  }

  // ─── Private UI Helpers ──────────────────────────────────────

  private focusInput(): void {
    if (this.messageInput?.nativeElement) {
      this.messageInput.nativeElement.focus();
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.hotelBookingState()) {
      this.cancelHotelBooking();
      return;
    }
    if (this.busBookingState()) {
      this.cancelBusBooking();
      return;
    }
    if (this.isOpen()) {
      this.close();
    }
  }
}
