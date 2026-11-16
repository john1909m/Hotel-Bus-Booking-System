import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  HostListener,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, NavigationStart } from '@angular/router';
import { firstValueFrom, of, catchError, forkJoin, Subscription, filter } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AiChatService } from '../../../core/services/ai-chat.service';
import { AiService } from '../../../core/services/ai.service';
import { RoomService } from '../../../core/services/room.service';
import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusRouteService } from '../../../core/services/bus-route.service';
import { BusTripService } from '../../../core/services/bus-trip.service';
import { HotelBusStopService } from '../../../core/services/hotel-bus-stop.service';
import { BookingStateService } from '../../../core/services/booking-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { SpeechInputService } from '../../../core/services/speech-input.service';

import {
  HotelDto,
  BusTripInfoDto,
  RoomDto as AiRoomDto,
  ChatMessageItem
} from '../../../core/models/AI Assistant/AIChat.model';
import { RoomDTO } from '../../../core/models/Room/room.model';
import {
  BookingDraftRequest,
  BookingDraftResponse
} from '../../../core/models/AI Assistant/BookingDraft.model';
import { BusSeatDTO } from '../../../core/models/Bus/bus-seat.model';
import { BusBookingDTO, BusBookingRequestDTO } from '../../../core/models/Bus/bus-booking.model';
import { BusStopDto } from '../../../core/models/Bus/bus-stop.model';
import { BusRouteDTO } from '../../../core/models/Bus/bus-route';
import { BusTripDTO } from '../../../core/models/Bus/bus-trip.model';
import { SpeechLanguage } from '../../../core/models/speech-recognition.model';
import { BusSeatSelectionComponent } from '../../../features/buses/bus-seat-selection/bus-seat-selection.component';
import { EnrichedBusTrip } from '../../../features/buses/bus-search-results/bus-search-results';
import { extractErrorMessage } from '../../../core/utils/ErrorHandling';
import { calculateGuestBreakdown } from '../../../core/utils/guest-rules.util';
import { isOutgoingEligible, isReturnEligible } from '../../../core/utils/bus-eligibility.util';

export interface InChatHotelBooking {
  step: 'dates' | 'origin' | 'rooms' | 'summary' | 'confirmed';
  hotel: HotelDto;
  checkIn: string;
  checkOut: string;
  adults: number;
  childCount: number;
  childAges: number[];
  originCity: string | null;
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
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, BusSeatSelectionComponent, TranslatePipe],
  templateUrl: './ai-chat-widget.component.html',
  styleUrl: './ai-chat-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatWidgetComponent implements OnInit, AfterViewChecked, OnDestroy {
  protected readonly aiChatService = inject(AiChatService);
  protected readonly aiService = inject(AiService);
  protected readonly roomService = inject(RoomService);
  protected readonly busSeatService = inject(BusSeatService);
  protected readonly busBookingService = inject(BusBookingService);
  protected readonly busStopService = inject(BusStopService);
  protected readonly busRouteService = inject(BusRouteService);
  protected readonly busTripService = inject(BusTripService);
  protected readonly hotelBusStopService = inject(HotelBusStopService);
  protected readonly bookingState = inject(BookingStateService);
  protected readonly authService = inject(AuthService);
  protected readonly speechService = inject(SpeechInputService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService, { optional: true });

  private tr(key: string, params?: Record<string, any>, fallback?: string): string {
    if (this.translate) {
      const res = this.translate.instant(key, params);
      if (res && res !== key) return res;
    }
    return fallback || key;
  }

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') private messageInput?: ElementRef<HTMLTextAreaElement>;

  readonly isOpen = signal<boolean>(false);
  readonly currentInput = signal<string>('');
  private shouldScrollToBottom = false;

  // Speech Input State
  readonly selectedSpeechLang = signal<SpeechLanguage>('en-US');
  private speechBaseInput = '';
  private routerSub?: Subscription;

  // In-Chat Booking Flows
  readonly hotelBookingState = signal<InChatHotelBooking | null>(null);
  readonly busBookingState = signal<InChatBusBooking | null>(null);

  // Transportation Integration State (Part 4)
  readonly availableOriginCities = signal<string[]>([]);
  readonly selectedHotelBusStop = signal<BusStopDto | null>(null);
  readonly selectedHotelBusStopId = signal<number | null>(null);
  readonly seatDialogVisible = signal<boolean>(false);
  readonly selectedTripForSeats = signal<EnrichedBusTrip | null>(null);

  // Idempotency keys stored per draft ID
  private readonly idempotencyKeys = new Map<number | string, string>();

  // Confirmation state per draft
  readonly confirmingDraftId = signal<number | string | null>(null);
  readonly draftErrors = signal<Map<number | string, string>>(new Map());

  getIdempotencyKey(draftId: number | string): string {
    let key = this.idempotencyKeys.get(draftId);
    if (!key) {
      key = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : this.generateUUID();
      this.idempotencyKeys.set(draftId, key);
    }
    return key;
  }

  getDraftError(draftId: number | string): string | null {
    return this.draftErrors().get(draftId) || null;
  }

  setDraftError(draftId: number | string, error: string): void {
    this.draftErrors.update((map) => {
      const next = new Map(map);
      next.set(draftId, error);
      return next;
    });
  }

  clearDraftError(draftId: number | string): void {
    this.draftErrors.update((map) => {
      const next = new Map(map);
      next.delete(draftId);
      return next;
    });
  }

  generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async confirmDraft(draft: BookingDraftResponse): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    const draftId = draft.id;
    const key = this.getIdempotencyKey(draftId);
    this.clearDraftError(draftId);
    this.confirmingDraftId.set(draftId);

    if (this.aiChatService.isMockMode()) {
      draft.status = 'CONFIRMED';
      draft.bookingId = draft.bookingId || Math.floor(Math.random() * 8000) + 1000;
      this.confirmingDraftId.set(null);

      this.aiChatService.messages.update((list) => [
        ...list,
        {
          id: this.generateUUID(),
          sender: 'assistant',
          text: `✅ Booking submitted successfully! Hotel Reference: #${draft.bookingId}. Your reservation is currently under administrative review (PENDING). An administrator will review and confirm your booking.`,
          timestamp: new Date(),
          isMock: true,
        }
      ]);
      this.shouldScrollToBottom = true;
      return;
    }

    try {
      const response = await firstValueFrom(
        this.aiService.confirmBookingDraft(draftId, key)
      );

      draft.status = response.status || 'CONFIRMED';
      draft.bookingId = response.bookingId;
      draft.busBookingIds = response.busBookingIds;
      this.confirmingDraftId.set(null);

      const busRefText = response.busBookingIds && response.busBookingIds.length > 0
        ? ` | Bus Reference(s): #${response.busBookingIds.join(', #')}`
        : '';

      this.aiChatService.messages.update((list) => [
        ...list,
        {
          id: this.generateUUID(),
          sender: 'assistant',
          text: `✅ Booking submitted successfully! Hotel Reference: #${response.bookingId || response.id}${busRefText}. Your reservation is currently under administrative review (PENDING). An administrator will review and confirm your booking.`,
          timestamp: new Date(),
          isMock: false,
        }
      ]);
      this.shouldScrollToBottom = true;
    } catch (err: any) {
      this.confirmingDraftId.set(null);
      const isExpired = err?.status === 410 || err?.code === 'DRAFT_EXPIRED';
      const isNotFound = err?.status === 404 || err?.code === 'DRAFT_NOT_FOUND';

      if (isExpired) {
        draft.status = 'EXPIRED';
      }

      const errorMsg = extractErrorMessage(err, isExpired
        ? 'This booking draft has expired. Please create a new draft.'
        : 'Booking confirmation failed. Please try again.');

      this.setDraftError(draftId, errorMsg);

      if (isExpired || isNotFound) {
        this.aiChatService.messages.update((list) => [
          ...list,
          {
            id: this.generateUUID(),
            sender: 'assistant',
            text: `⚠️ Draft #${draftId} is no longer valid (${errorMsg}). Would you like me to help you find another stay or trip?`,
            timestamp: new Date(),
            isMock: false,
          }
        ]);
      }

      this.shouldScrollToBottom = true;
    }
  }

  cancelDraft(draft: BookingDraftResponse): void {
    draft.status = 'CANCELLED';
    this.clearDraftError(draft.id);
    this.aiChatService.messages.update((list) => [
      ...list,
      {
        id: this.generateUUID(),
        sender: 'assistant',
        text: `Booking draft #${draft.id} for ${draft.hotelName || 'hotel'} has been cancelled.`,
        timestamp: new Date(),
        isMock: this.aiChatService.isMockMode(),
      }
    ]);
    this.shouldScrollToBottom = true;
  }

  readonly suggestedPrompts: string[] = [
    'aiChat.footer.promptCairoHotels',
    'aiChat.footer.promptBusTrips',
    'aiChat.footer.promptResorts',
    'aiChat.footer.promptMyBookings',
  ];

  ngOnInit(): void {
    this.loadOriginCities();
    if (this.authService.isAuthenticated() && !this.aiChatService.isMockMode()) {
      this.aiChatService.loadConversationHistory().subscribe({
        next: () => {
          this.shouldScrollToBottom = true;
        }
      });
    }

    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => {
        if (this.speechService.isListening()) {
          this.speechService.stop();
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.speechService.dispose();
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
    if (this.speechService.isListening()) {
      this.speechService.stop();
    }
    this.isOpen.set(false);
  }

  clearHistory(): void {
    if (this.speechService.isListening()) {
      this.speechService.stop();
    }
    this.speechBaseInput = '';
    this.speechService.error.set(null);
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
    if (this.speechService.isListening()) {
      this.speechService.stop();
    }
    this.speechBaseInput = '';

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

  toggleSpeechInput(): void {
    if (this.speechService.isListening()) {
      this.speechService.stop();
      return;
    }
    this.speechBaseInput = this.currentInput().trim();
    this.speechService.start(this.selectedSpeechLang(), ({ interim, final }) => {
      let speechCombined = final;
      if (interim) {
        speechCombined = speechCombined ? `${speechCombined} ${interim}` : interim;
      }
      if (speechCombined) {
        const updated = this.speechBaseInput
          ? `${this.speechBaseInput} ${speechCombined}`
          : speechCombined;
        this.currentInput.set(updated);
      }
    });
  }

  setSpeechLanguage(lang: SpeechLanguage): void {
    if (this.selectedSpeechLang() === lang) return;
    if (this.speechService.isListening()) {
      this.speechService.stop();
    }
    this.selectedSpeechLang.set(lang);
  }

  toggleSpeechLanguage(): void {
    const nextLang = this.selectedSpeechLang() === 'en-US' ? 'ar-EG' : 'en-US';
    this.setSpeechLanguage(nextLang);
  }

  clearSpeechError(): void {
    this.speechService.error.set(null);
  }

  sendSuggested(prompt: string): void {
    const text = this.tr(prompt, undefined, prompt);
    this.currentInput.set(text);
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
      originCity: null,
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

  getRoomSelectionTitle(adults: number, childAges?: number[]): string {
    const children = childAges ? childAges.length : 0;
    if (children > 0) {
      return this.tr('aiChat.hotelWizard.selectRoomWithChildren', { adults, children }, `Select a room for ${adults} adult(s) and ${children} child(ren):`);
    }
    return this.tr('aiChat.hotelWizard.selectRoomAdultsOnly', { adults }, `Select a room for ${adults} adult(s):`);
  }

  proceedFromDates(): void {
    const s = this.hotelBookingState();
    if (!s) return;

    if (!s.checkIn || !s.checkOut) {
      this.hotelBookingState.update((curr) => (curr ? { ...curr, error: this.tr('aiChat.hotelWizard.errors.datesRequired', undefined, 'Please select both check-in and check-out dates.') } : null));
      return;
    }
    if (s.checkIn < this.getTodayDateString()) {
      this.hotelBookingState.update((curr) => (curr ? { ...curr, error: this.tr('aiChat.hotelWizard.errors.checkInPast', undefined, 'Check-in date cannot be in the past.') } : null));
      return;
    }
    if (s.checkOut <= s.checkIn) {
      this.hotelBookingState.update((curr) => (curr ? { ...curr, error: this.tr('aiChat.hotelWizard.errors.checkOutAfter', undefined, 'Check-out date must be after check-in date.') } : null));
      return;
    }

    if (!s.originCity) {
      this.hotelBookingState.update((curr) => (curr ? { ...curr, step: 'origin', error: null } : null));
      this.shouldScrollToBottom = true;
      return;
    }

    this.suggestBusTripsAndLoadRooms(s.originCity);
  }

  async chooseOriginCity(originCity: string): Promise<void> {
    this.hotelBookingState.update((s) => (s ? { ...s, originCity, loading: true, error: null } : null));
    await this.suggestBusTripsAndLoadRooms(originCity);
  }

  async skipOriginCity(): Promise<void> {
    this.hotelBookingState.update((s) => (s ? { ...s, originCity: '', loading: true, error: null } : null));
    await this.loadHotelRooms();
  }

  backToOriginFromRooms(): void {
    this.hotelBookingState.update((s) => (s ? { ...s, step: 'origin', error: null } : null));
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
          },
          {
            id: 204,
            roomNumber: '401',
            roomType: 'FAMILY' as any,
            capacity: 3,
            pricePerNight: (s.hotel.minPrice || 1600) + 300,
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

      // Guest breakdown calculation using guest-rules.util.ts
      const breakdown = calculateGuestBreakdown({
        adults: s.adults,
        childAges: s.childAges,
        guests: s.adults + s.childAges.length,
      });

      // Filter rooms matching capacity: capacity >= requiredCapacity (smaller rooms excluded)
      const suitable = rooms.filter((r) => r.capacity >= breakdown.requiredCapacity);
      // Sort by capacity ASC, then price ASC
      suitable.sort((a, b) => {
        if (a.capacity !== b.capacity) {
          return a.capacity - b.capacity;
        }
        return (a.pricePerNight ?? 0) - (b.pricePerNight ?? 0);
      });

      this.hotelBookingState.update((curr) =>
        curr
          ? {
              ...curr,
              availableRooms: suitable,
              selectedRoom: suitable.length > 0 ? suitable[0] : null,
              step: 'rooms',
              loading: false,
              error: suitable.length === 0 ? `No rooms available for the selected guest count (requires capacity of ${breakdown.requiredCapacity}).` : null,
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

  // ─── Bus Transportation Integration (Part 4) ────────────────
  async loadOriginCities(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.busStopService.getAllBusStops({ size: 100 }).pipe(
          catchError(() => of({ content: [] as BusStopDto[] }))
        )
      );
      const stops = page?.content || [];
      const cities = Array.from(new Set(stops.map((s) => s.city?.trim()).filter((c): c is string => !!c))).sort();
      if (cities.length > 0) {
        this.availableOriginCities.set(cities);
      } else {
        this.availableOriginCities.set(['Cairo', 'Alexandria', 'Hurghada', 'Luxor', 'Sharm El Sheikh', 'Giza', 'Aswan']);
      }
    } catch {
      this.availableOriginCities.set(['Cairo', 'Alexandria', 'Hurghada', 'Luxor', 'Sharm El Sheikh', 'Giza', 'Aswan']);
    }
  }

  async suggestBusTripsAndLoadRooms(originCity: string): Promise<void> {
    const s = this.hotelBookingState();
    if (!s) return;

    if (originCity) {
      await this.suggestBusTripsForHotel(s.hotel, s.checkIn, s.checkOut, originCity);
    }
    await this.loadHotelRooms();
  }

  async suggestBusTripsForHotel(hotel: HotelDto, checkInDate: string, checkOutDate: string, originCity: string): Promise<void> {
    if (this.aiChatService.isMockMode()) {
      const destCity = hotel.city || 'Alexandria';
      const destStopName = `${destCity} Bus Terminal`;
      if (originCity.toLowerCase() === destCity.toLowerCase()) {
        const msg: ChatMessageItem = {
          id: this.generateUUID(),
          sender: 'assistant',
          text: `No direct bus trips found from ${originCity} to ${hotel.name} (${destStopName}) on ${checkInDate}. Routes in our system have no intermediate stops, so a trip qualifies only if its destination stop is ${destStopName}.`,
          timestamp: new Date(),
          isMock: true,
        };
        this.aiChatService.messages.update((list) => [...list, msg]);
      } else {
        const mockTrips: BusTripInfoDto[] = [
          {
            id: 301,
            tripId: 301,
            routeId: 10,
            routeName: `${originCity} ➔ ${destCity} Morning Express`,
            originCity,
            originStopName: `${originCity} Central Station`,
            destinationCity: destCity,
            destinationStopName: destStopName,
            departureTime: `${checkInDate}T08:30:00`,
            arrivalTime: `${checkInDate}T11:30:00`,
            price: 240,
            busCompany: 'Go Bus Premium',
            availableSeats: 18,
            status: 'SCHEDULED',
          },
          {
            id: 302,
            tripId: 302,
            routeId: 10,
            routeName: `${originCity} ➔ ${destCity} Afternoon`,
            originCity,
            originStopName: `${originCity} Central Station`,
            destinationCity: destCity,
            destinationStopName: destStopName,
            departureTime: `${checkInDate}T14:00:00`,
            arrivalTime: `${checkInDate}T17:00:00`,
            price: 260,
            busCompany: 'Super Jet VIP',
            availableSeats: 12,
            status: 'SCHEDULED',
          }
        ];

        const msg: ChatMessageItem = {
          id: this.generateUUID(),
          sender: 'assistant',
          text: `Here are available bus trips from ${originCity} to ${hotel.name} (${destStopName}) for your stay:`,
          timestamp: new Date(),
          results: [
            {
              type: 'BUS_TRIP',
              data: mockTrips,
            }
          ],
          isMock: true,
        };
        this.aiChatService.messages.update((list) => [...list, msg]);
      }
      return;
    }

    // Real Mode
    const destStop = await this.resolveDestinationBusStop(hotel);
    if (!destStop) {
      const msg: ChatMessageItem = {
        id: this.generateUUID(),
        sender: 'assistant',
        text: `No bus stop is currently associated with ${hotel.name} in ${hotel.city || 'this area'}. Routes in our system have no intermediate stops, so a trip qualifies only if its destination stop is the hotel's stop.`,
        timestamp: new Date(),
        isMock: false,
      };
      this.aiChatService.messages.update((list) => [...list, msg]);
      return;
    }

    this.selectedHotelBusStop.set(destStop);
    this.selectedHotelBusStopId.set(destStop.id);

    try {
      const allStopsPage = await firstValueFrom(
        this.busStopService.getAllBusStops({ size: 100 }).pipe(catchError(() => of({ content: [] as BusStopDto[] })))
      );
      const allStops = allStopsPage?.content || [];
      const originStops = allStops.filter((s) => (s.city || '').toLowerCase() === originCity.toLowerCase());
      const originStopIds = new Set(originStops.map((s) => s.id));

      if (originStopIds.size === 0) {
        const msg: ChatMessageItem = {
          id: this.generateUUID(),
          sender: 'assistant',
          text: `No bus stations found in ${originCity}. Please choose another departure city.`,
          timestamp: new Date(),
          isMock: false,
        };
        this.aiChatService.messages.update((list) => [...list, msg]);
        return;
      }

      const routesPage = await firstValueFrom(
        this.busRouteService.getAllBusRoutes({ size: 100 }).pipe(catchError(() => of({ content: [] as BusRouteDTO[] })))
      );
      const allRoutes = routesPage?.content || [];
      const matchingRoutes = allRoutes.filter((r) => originStopIds.has(r.originStopId) && r.destinationStopId === destStop.id);

      if (matchingRoutes.length === 0) {
        const msg: ChatMessageItem = {
          id: this.generateUUID(),
          sender: 'assistant',
          text: `No direct bus routes found from ${originCity} to ${hotel.name} (${destStop.name}). Routes in our system have no intermediate stops, so a trip qualifies only if its destination stop is ${destStop.name}.`,
          timestamp: new Date(),
          isMock: false,
        };
        this.aiChatService.messages.update((list) => [...list, msg]);
        return;
      }

      const tripRequests = matchingRoutes.map((route) =>
        this.busTripService.getAllBusTrips({
          routeId: route.id,
          departureAfter: `${checkInDate}T00:00:00`,
          departureBefore: `${checkInDate}T23:59:59`,
          status: 'SCHEDULED',
          size: 50,
        }).pipe(catchError(() => of({ content: [] as BusTripDTO[] })))
      );

      const tripPages = await firstValueFrom(forkJoin(tripRequests));
      const rawTrips: BusTripDTO[] = tripPages.flatMap((p) => p?.content || []);

      const stay = { checkIn: checkInDate, checkOut: checkOutDate };
      const eligibleTrips = rawTrips.filter((t) =>
        isOutgoingEligible({ ...t, destinationStop: destStop }, stay, destStop.id)
      );

      if (eligibleTrips.length === 0) {
        const msg: ChatMessageItem = {
          id: this.generateUUID(),
          sender: 'assistant',
          text: `No scheduled bus trips found from ${originCity} to ${hotel.name} (${destStop.name}) on ${checkInDate}. Routes in our system have no intermediate stops, so a trip qualifies only if its destination stop is ${destStop.name}.`,
          timestamp: new Date(),
          isMock: false,
        };
        this.aiChatService.messages.update((list) => [...list, msg]);
        return;
      }

      const enrichedTripDtos: BusTripInfoDto[] = eligibleTrips.map((t) => {
        const route = matchingRoutes.find((r) => r.id === t.routeId);
        const origStop = allStops.find((s) => s.id === (route?.originStopId ?? (t as any).originStopId));
        return {
          id: t.id,
          tripId: t.id,
          routeId: t.routeId,
          routeName: route?.name || `${origStop?.name || originCity} ➔ ${destStop.name}`,
          originCity: origStop?.city || originCity,
          originStopName: origStop?.name || `${originCity} Station`,
          destinationCity: destStop.city,
          destinationStopName: destStop.name,
          departureTime: t.departureTime || (t as any).departure || '',
          arrivalTime: t.arrivalTime || '',
          price: t.price,
          busCompany: (t as any).busCompany || 'TravelEase Express',
          status: t.status,
        };
      });

      const msg: ChatMessageItem = {
        id: this.generateUUID(),
        sender: 'assistant',
        text: `Here are available bus trips from ${originCity} to ${hotel.name} (${destStop.name}) for your stay:`,
        timestamp: new Date(),
        results: [
          {
            type: 'BUS_TRIP',
            data: enrichedTripDtos,
          }
        ],
        isMock: false,
      };
      this.aiChatService.messages.update((list) => [...list, msg]);
      this.shouldScrollToBottom = true;
    } catch (err) {
      console.error('Error querying bus suggestions:', err);
    }
  }

  async resolveDestinationBusStop(hotel: HotelDto): Promise<BusStopDto | null> {
    if (!hotel?.id) return null;

    // 1. Try querying backend hotel-bus-stops association
    try {
      const hotelBusStops = await firstValueFrom(
        this.hotelBusStopService.getHotelBusStopsByHotelId(hotel.id).pipe(
          catchError(() => of([] as any[]))
        )
      );
      if (hotelBusStops && hotelBusStops.length > 0) {
        const primary = hotelBusStops[0];
        const stop = await firstValueFrom(
          this.busStopService.getBusStopById(primary.busStopId).pipe(
            catchError(() => of(null))
          )
        );
        if (stop) return stop;
      }
    } catch {
      // Fallback
    }

    // 2. Fallback: Query bus stops in the hotel's city
    if (hotel.city) {
      try {
        const cityStopsPage = await firstValueFrom(
          this.busStopService.getAllBusStops({ city: hotel.city.trim(), size: 50 }).pipe(
            catchError(() => of({ content: [] as BusStopDto[] }))
          )
        );
        const cityStops = cityStopsPage?.content || [];
        if (cityStops.length > 0) {
          if (hotel.latitude !== undefined && hotel.longitude !== undefined) {
            let closestStop = cityStops[0];
            let minDistance = this.calculateDistance(
              hotel.latitude,
              hotel.longitude,
              closestStop.latitude,
              closestStop.longitude
            );
            for (let i = 1; i < cityStops.length; i++) {
              const dist = this.calculateDistance(
                hotel.latitude,
                hotel.longitude,
                cityStops[i].latitude,
                cityStops[i].longitude
              );
              if (dist < minDistance) {
                minDistance = dist;
                closestStop = cityStops[i];
              }
            }
            return closestStop;
          }
          return cityStops[0];
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  private calculateDistance(lat1?: number, lon1?: number, lat2?: number, lon2?: number): number {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
      return 0;
    }
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  selectBusTripForSummary(trip: any): void {
    const destStopId = trip.destinationStopId || trip.destinationStop?.id || this.selectedHotelBusStopId() || 2;
    const originStopId = trip.originStopId || trip.originStop?.id || 1;

    const enriched: EnrichedBusTrip = {
      id: trip.id ?? trip.tripId,
      routeId: trip.routeId || 1,
      busId: trip.busId || 1,
      departureTime: trip.departureTime || trip.departure,
      arrivalTime: trip.arrivalTime,
      price: trip.price,
      status: trip.status || 'SCHEDULED',
      formattedDuration: trip.formattedDuration || '3h 0m',
      isOvernight: !!trip.isOvernight,
      originStop: {
        id: originStopId,
        name: trip.originStopName || trip.originCity || 'Origin',
        city: trip.originCity || 'Origin City',
      } as any,
      destinationStop: {
        id: destStopId,
        name: trip.destinationStopName || trip.destinationCity || 'Destination',
        city: trip.destinationCity || 'Destination City',
      } as any,
      route: {
        id: trip.routeId || 1,
        name: trip.routeName || `${trip.originCity || 'Origin'} ➔ ${trip.destinationCity || 'Destination'}`,
        originStopId,
        destinationStopId: destStopId,
      } as any,
    };

    this.selectedTripForSeats.set(enriched);
    this.seatDialogVisible.set(true);
  }

  closeSeatDialog(): void {
    this.seatDialogVisible.set(false);
    this.selectedTripForSeats.set(null);
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

      const draftMsg: ChatMessageItem = {
        id: this.generateUUID(),
        sender: 'assistant',
        text: `I've prepared a booking draft for your stay at ${mockDraft.hotelName}. Please review the reservation details below and confirm when you're ready:`,
        timestamp: new Date(),
        draftId: mockDraft.id,
        draft: mockDraft,
        isMock: true,
      };

      this.cancelHotelBooking();
      this.aiChatService.messages.update((list) => [...list, draftMsg]);
      this.shouldScrollToBottom = true;
      return;
    }

    const payload: BookingDraftRequest = {
      hotelId: s.hotel.id,
      roomId: s.selectedRoom.id,
      roomIds: [s.selectedRoom.id],
      checkInDate: s.checkIn,
      checkOutDate: s.checkOut,
      adults: s.adults,
      childAges: s.childAges,
    };

    try {
      const response = await firstValueFrom(this.aiService.createBookingDraft(payload));
      const draftMsg: ChatMessageItem = {
        id: this.generateUUID(),
        sender: 'assistant',
        text: `I've prepared a booking draft for your stay at ${response.hotelName || s.hotel.name}. Please review the reservation details below and confirm when you're ready:`,
        timestamp: new Date(),
        draftId: response.id,
        draft: response,
        isMock: false,
      };

      this.cancelHotelBooking();
      this.aiChatService.messages.update((list) => [...list, draftMsg]);
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
    await this.confirmDraft(s.draft);
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
          id: this.generateUUID(),
          sender: 'assistant',
          text: ` Bus booking submitted! Ticket #${mockBooking.id} for Seat ${s.selectedSeat?.seatNumber} (${this.getTripOrigin(s.trip)} ➔ ${this.getTripDestination(s.trip)}). Your reservation is under administrative review (PENDING).`,
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
          id: this.generateUUID(),
          sender: 'assistant',
          text: ` Bus booking submitted! Reference: #${response.id} for Seat ${s.selectedSeat?.seatNumber}. Your reservation is under administrative review (PENDING). Safe travels!`,
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
