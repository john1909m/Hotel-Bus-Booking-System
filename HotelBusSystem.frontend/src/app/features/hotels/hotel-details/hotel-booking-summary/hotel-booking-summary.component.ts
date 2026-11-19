import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  computed,
  inject,
  signal,
  effect,
  untracked,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, of, catchError, forkJoin, Subject, takeUntil, Observable } from 'rxjs';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BusStopService } from '../../../../core/services/bus-stop.service';
import { BusRouteService } from '../../../../core/services/bus-route.service';
import { BusTripService } from '../../../../core/services/bus-trip.service';
import { BusService } from '../../../../core/services/bus.service';
import { BusBookingService } from '../../../../core/services/bus-booking.service';
import { HotelBusStopService } from '../../../../core/services/hotel-bus-stop.service';
import { HotelBookingService } from '../../../../core/services/hotel-booking.service';
import { HotelService } from '../../../../core/services/hotel.service';
import { AuthService } from '../../../../core/services/auth.service';
import { BookingStateService } from '../../../../core/services/booking-state.service';

import { HotelDTO } from '../../../../core/models/Hotel/hotel.model';
import { HotelBookingRequestDTO } from '../../../../core/models/Hotel/hotel-booking.model';
import { RoomDTO, roomType } from '../../../../core/models/Room/room.model';
import { BusStopDto } from '../../../../core/models/Bus/bus-stop.model';
import { BusRouteDTO } from '../../../../core/models/Bus/bus-route';
import { BusTripDTO } from '../../../../core/models/Bus/bus-trip.model';
import { PageBusTripDTO } from '../../../../core/models/Pagination/busTripPage.model';
import { BusDTO } from '../../../../core/models/Bus/bus.model';
import { BusSeatDTO } from '../../../../core/models/Bus/bus-seat.model';
import { HotelBusStopDTO } from '../../../../core/models/Hotel/hotel-bus-stop.model';
import { EnrichedBusTrip } from '../../../buses/bus-search-results/bus-search-results';
import { BusSeatSelectionComponent } from '../../../buses/bus-seat-selection/bus-seat-selection.component';
import { ChildGuest } from '../hotel-details';
import { isChildFree, MAX_FREE_CHILDREN_PER_BOOKING } from '../../../../core/utils/guest-rules.util';
import {
  isOutgoingEligible,
  isReturnEligible,
  isOutgoingRecommended,
  getOutgoingTimingBadge,
  getReturnTimingBadge,
  extractLocalDateStr,
} from '../../../../core/utils/bus-eligibility.util';

export interface RecommendedBusTrip extends EnrichedBusTrip {
  distanceFromHotel: number | null;
  availableSeatsCount: number;
  minutesRelative: number;
  isPreferredTiming: boolean; // Arriving ~30-60 min before check-in for outgoing
  timingBadgeLabel: string;
}

export interface BusStopOption {
  label: string;
  value: number; // bus stop ID
  stop: BusStopDto;
}

@Component({
  selector: 'app-hotel-booking-summary',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    DatePipe,
    RouterLink,
    DrawerModule,
    ButtonModule,
    TagModule,
    SelectModule,
    SkeletonModule,
    DatePickerModule,
    MessageModule,
    BusSeatSelectionComponent,
    TranslatePipe,
  ],
  templateUrl: './hotel-booking-summary.component.html',
  styleUrl: './hotel-booking-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelBookingSummaryComponent implements OnInit, OnChanges, OnDestroy {
  readonly bookingState = inject(BookingStateService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService, { optional: true });
  private readonly hotelBookingService = inject(HotelBookingService);
  private readonly hotelService = inject(HotelService, { optional: true });
  private readonly destroy$ = new Subject<void>();

  private readonly busStopService = inject(BusStopService);
  private readonly busRouteService = inject(BusRouteService);
  private readonly busTripService = inject(BusTripService);
  private readonly busService = inject(BusService);
  private readonly busBookingService = inject(BusBookingService);
  private readonly hotelBusStopService = inject(HotelBusStopService);

  // ── Inputs (Optional when hosted in layout, derived from bookingState) ────
  @Input()
  set visible(val: boolean) {
    if (val !== this.bookingState.summaryOpen()) {
      this.bookingState.setSummaryOpen(val);
    }
  }
  get visible(): boolean {
    return this.bookingState.summaryOpen();
  }
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
  @Input() requiredCapacity = 0;
  @Input() totalRoomCapacity = 0;
  @Input() isAdultsIncreaseDisabled = false;
  @Input() isEditMode = false;
  @Input() editingBookingId: number | null = null;
  @Input() originalTotalPrice: number | null = null;

  get activeEditingBookingId(): number | null {
    return this.editingBookingId ?? this.bookingState.editingBookingId();
  }

  get activeIsEditMode(): boolean {
    return this.isEditMode || this.activeEditingBookingId !== null;
  }
  @Input() isSubmitting = false;
  @Input() errorMessage: string | null = null;
  @Input() errorStatus: number | null = null;
  @Input() isAuthenticated = false;
  @Input() currentUrl = '';
  @Input() validationErrors: string[] = [];
  @Input() canSubmit = true;

  // ── Outputs ─────────────────────────────────────────────────
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() increaseTotalAdults = new EventEmitter<void>();
  @Output() decreaseTotalAdults = new EventEmitter<void>();
  @Output() increaseTotalChildren = new EventEmitter<void>();
  @Output() decreaseTotalChildren = new EventEmitter<void>();
  @Output() roomAdultsChange = new EventEmitter<{ roomId: number; delta: number }>();
  @Output() addChildToRoom = new EventEmitter<number>();
  @Output() removeChildFromRoom = new EventEmitter<{ childId: number; roomId: number }>();
  @Output() childAgeChange = new EventEmitter<{ childId: number; age: number | null }>();
  @Output() removeRoom = new EventEmitter<number>();
  @Output() autoDistribute = new EventEmitter<void>();
  @Output() changeDatesRequest = new EventEmitter<void>();
  @Output() submitBooking = new EventEmitter<void>();
  @Output() continueToPayment = new EventEmitter<void>();
  @Output() clearSummary = new EventEmitter<void>();

  readonly availableChildAges: readonly number[] = Array.from({ length: 18 }, (_, i) => i);

  // ── Derived State Signals ───────────────────────────────────
  readonly effectiveHotel = computed(() => {
    return this.hotel || this.bookingState.hotelBooking()?.hotel || null;
  });

  readonly effectiveRooms = computed(() => {
    if (this.selectedRooms && this.selectedRooms.length > 0) return this.selectedRooms;
    return this.bookingState.hotelBooking()?.selectedRooms || [];
  });

  readonly effectiveCheckIn = computed(() => {
    return this.bookingState.checkIn() || this.bookingState.hotelBooking()?.checkIn || this.checkIn || this.formattedCheckIn || '';
  });

  readonly effectiveCheckOut = computed(() => {
    return this.bookingState.checkOut() || this.bookingState.hotelBooking()?.checkOut || this.checkOut || this.formattedCheckOut || '';
  });

  readonly effectiveStayNights = computed(() => {
    const fromState = this.bookingState.stayNights();
    if (fromState !== null && fromState !== undefined) return fromState;
    if (this.bookingState.hotelBooking()?.stayNights !== undefined) return this.bookingState.hotelBooking()?.stayNights ?? null;
    if (this.stayNights !== null && this.stayNights !== undefined) return this.stayNights;
    return null;
  });

  readonly effectiveAdultsCount = computed(() => {
    return this.bookingState.adults() || this.bookingState.hotelBooking()?.adultsCount || this.adultsCount || 2;
  });

  readonly effectiveChildren = computed(() => {
    if (this.bookingState.children().length > 0) return this.bookingState.children();
    if (this.bookingState.hotelBooking()?.children && this.bookingState.hotelBooking()!.children.length > 0) {
      return this.bookingState.hotelBooking()!.children;
    }
    if (this.children && this.children.length > 0) return this.children;
    return [];
  });

  readonly effectiveCustomRoomAdults = computed(() => {
    if (this.customRoomAdults && Object.keys(this.customRoomAdults).length > 0) {
      return this.customRoomAdults;
    }
    return this.bookingState.hotelBooking()?.customRoomAdults || {};
  });

  readonly effectiveCustomRoomChildIds = computed(() => {
    if (this.customRoomChildIds && Object.keys(this.customRoomChildIds).length > 0) {
      return this.customRoomChildIds;
    }
    return this.bookingState.hotelBooking()?.customRoomChildIds || {};
  });

  readonly effectiveTotalNightlyRate = computed(() => {
    if (this.totalNightlyRate > 0) return this.totalNightlyRate;
    return this.effectiveRooms().reduce((sum, r) => sum + (r.pricePerNight || 0), 0);
  });

  readonly effectiveTotalStayCost = computed(() => {
    if (this.totalStayCost !== null && this.totalStayCost !== undefined) return this.totalStayCost;
    const nights = this.effectiveStayNights();
    if (nights && nights > 0) {
      return this.effectiveTotalNightlyRate() * nights;
    }
    return null;
  });

  readonly effectiveTotalRoomCapacity = computed(() => {
    return this.effectiveRooms().reduce((sum, r) => sum + (r.capacity || 2), 0);
  });

  readonly effectiveRequiredCapacity = computed(() => {
    const adults = this.effectiveAdultsCount();
    const chargeableChildren = this.effectiveChildren().filter(
      (c) => c.age !== null && c.age !== undefined && c.age >= 12
    ).length;
    return adults + chargeableChildren;
  });

  readonly isDrawerVisible = computed(() => {
    return this.bookingState.summaryOpen();
  });

  readonly hasHotel = computed<boolean>(() => {
    return this.bookingState.hasHotel();
  });

  readonly hasValidStayDates = computed<boolean>(() => {
    return this.bookingState.hasValidStayDates();
  });

  readonly canContinueToPayment = computed<boolean>(() => {
    return this.bookingState.canContinueToPayment();
  });

  readonly effectiveOriginalTotalPrice = computed<number | null>(() => {
    if (this.originalTotalPrice !== null && this.originalTotalPrice !== undefined) {
      return this.originalTotalPrice;
    }
    return this.bookingState.originalBookingTotalPrice();
  });

  readonly priceDelta = computed<number>(() => {
    const orig = this.effectiveOriginalTotalPrice();
    if (orig === null || orig === undefined || !this.activeIsEditMode) {
      return 0;
    }
    const currentTotal = (this.effectiveTotalStayCost() || 0) + this.bookingState.transportationPrice();
    return Math.round((currentTotal - orig) * 100) / 100;
  });

  readonly additionalAmountDue = computed<number>(() => {
    return Math.max(0, this.priceDelta());
  });

  readonly isNoPaymentDue = computed<boolean>(() => {
    return this.activeIsEditMode && this.effectiveOriginalTotalPrice() !== null && this.priceDelta() <= 0;
  });

  // ── Transportation State ────────────────────────────────────
  readonly busStopOptions = signal<BusStopOption[]>([]);
  readonly allStops = signal<BusStopDto[]>([]);
  readonly isLoadingStops = signal<boolean>(false);
  readonly stopsLoadError = signal<string | null>(null);

  readonly selectedOriginStopId = signal<number | null>(null);
  readonly hotelBusStop = signal<BusStopDto | null>(null);
  readonly hotelBusDistance = signal<number | null>(null);
  readonly destinationStopError = signal<string | null>(null);

  readonly activeTransportTab = signal<'outgoing' | 'return'>('outgoing');
  readonly isLoadingTrips = signal<boolean>(false);
  readonly outgoingTrips = signal<RecommendedBusTrip[]>([]);
  readonly returnTrips = signal<RecommendedBusTrip[]>([]);
  readonly tripsSearchError = signal<string | null>(null);
  readonly hasSearchedTrips = signal<boolean>(false);

  // Seat Selection Dialog State
  readonly seatDialogVisible = signal<boolean>(false);
  readonly activeTripForSeats = signal<RecommendedBusTrip | null>(null);
  readonly activeTripDirection = signal<'outgoing' | 'return'>('outgoing');

  // ── Inline Date Editing State ───────────────────────────────
  readonly isEditingDates = signal<boolean>(false);
  readonly editCheckInDate = signal<Date | null>(null);
  readonly editCheckOutDate = signal<Date | null>(null);
  readonly dateErrorMessage = signal<string | null>(null);

  readonly minCheckInDate = computed<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  readonly minCheckOutDate = computed<Date>(() => {
    const dIn = this.editCheckInDate();
    if (dIn) {
      const next = new Date(dIn);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  });

  private readonly busCache = new Map<number, BusDTO>();

  ngOnInit(): void {
    this.loadAllBusStops();
    const curHotel = this.effectiveHotel();
    if (curHotel) {
      this.resolveHotelBusStop(curHotel);
    }
    if (this.bookingState.originBusStopId()) {
      this.selectedOriginStopId.set(this.bookingState.originBusStopId());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const curHotel = this.effectiveHotel();
    if (changes['hotel'] && curHotel) {
      this.resolveHotelBusStop(curHotel);
    }
    if ((changes['checkIn'] || changes['checkOut']) && this.selectedOriginStopId()) {
      this.fetchRecommendations();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDrawerVisibleChange(val: boolean): void {
    this.bookingState.setSummaryOpen(val);
    this.visibleChange.emit(val);
    if (val) {
      const curHotel = this.effectiveHotel();
      if (curHotel && !this.hotelBusStop()) {
        this.resolveHotelBusStop(curHotel).then(() => {
          if (this.selectedOriginStopId()) {
            this.fetchRecommendations();
          }
        });
      } else if (this.selectedOriginStopId()) {
        this.fetchRecommendations();
      }
    }
  }

  closeDrawer(): void {
    this.bookingState.closeSummary();
    this.visibleChange.emit(false);
  }

  toggleEditDates(): void {
    if (this.isEditingDates()) {
      this.isEditingDates.set(false);
      this.dateErrorMessage.set(null);
    } else {
      this.openDateEditor();
    }
  }

  openDateEditor(): void {
    const inStr = this.effectiveCheckIn();
    const outStr = this.effectiveCheckOut();
    this.editCheckInDate.set(this.bookingState.parseLocalDate(inStr) || new Date());
    this.editCheckOutDate.set(this.bookingState.parseLocalDate(outStr) || null);
    this.dateErrorMessage.set(null);
    this.isEditingDates.set(true);
  }

  onCheckInSelect(date: Date): void {
    this.editCheckInDate.set(date);
    const curOut = this.editCheckOutDate();
    if (curOut && curOut.getTime() <= date.getTime()) {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      this.editCheckOutDate.set(next);
    }
    this.validateAndApplyDates();
  }

  onCheckOutSelect(date: Date): void {
    this.editCheckOutDate.set(date);
    this.validateAndApplyDates();
  }

  validateAndApplyDates(): void {
    const dIn = this.editCheckInDate();
    const dOut = this.editCheckOutDate();
    if (!dIn || !dOut) return;

    const inIso = this.bookingState.formatDateToIso(dIn);
    const outIso = this.bookingState.formatDateToIso(dOut);
    const validation = this.bookingState.setStayDates(inIso, outIso);

    if (!validation.isValid) {
      this.dateErrorMessage.set(validation.error || this.translate?.instant('summary.invalidDateRange') || 'Invalid date range selected.');
      return;
    }

    this.dateErrorMessage.set(null);
    this.changeDatesRequest.emit();
    this.fetchRecommendations();
  }

  closeDateEditor(): void {
    this.isEditingDates.set(false);
    this.dateErrorMessage.set(null);
  }

  onChangeDates(): void {
    this.toggleEditDates();
  }

  // ── Transportation Loading & Resolution ─────────────────────
  async loadAllBusStops(): Promise<void> {
    this.isLoadingStops.set(true);
    this.stopsLoadError.set(null);
    try {
      const page = await firstValueFrom(
        this.busStopService.getAllBusStops({ size: 1000 }).pipe(
          catchError((err) => {
            this.stopsLoadError.set(this.translate?.instant('summary.failedToLoadBusStops') || 'Failed to load bus stops.');
            return of({ content: [] as BusStopDto[] });
          })
        )
      );
      const stops = page?.content || [];
      this.allStops.set(stops);

      const options: BusStopOption[] = stops
        .map((s) => ({
          label: `${s.name} (${s.city})`,
          value: s.id,
          stop: s,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      this.busStopOptions.set(options);
    } catch (err) {
      this.stopsLoadError.set(this.translate?.instant('summary.failedToLoadBusStops') || 'Failed to load bus stops.');
    } finally {
      this.isLoadingStops.set(false);
    }
  }

  async resolveHotelBusStop(hotel: HotelDTO): Promise<void> {
    if (!hotel?.id) return;
    this.destinationStopError.set(null);

    try {
      // 1. Try querying backend hotel-bus-stops association
      let hotelBusStops: HotelBusStopDTO[] = [];
      try {
        hotelBusStops = await firstValueFrom(
          this.hotelBusStopService.getHotelBusStopsByHotelId(hotel.id).pipe(
            catchError(() => of([] as HotelBusStopDTO[]))
          )
        );
      } catch {
        hotelBusStops = [];
      }

      if (hotelBusStops && hotelBusStops.length > 0) {
        const primary = hotelBusStops[0];
        this.hotelBusDistance.set(primary.distance);

        const stop = await firstValueFrom(
          this.busStopService.getBusStopById(primary.busStopId).pipe(
            catchError(() => of(null))
          )
        );
        if (stop) {
          this.hotelBusStop.set(stop);
          return;
        }
      }

      // 2. Fallback: Find closest bus stop in the hotel's city or nearest bus stop
      if (this.allStops().length === 0) {
        await this.loadAllBusStops();
      }
      let cityStops: BusStopDto[] = [];
      if (hotel.city) {
        const targetCity = hotel.city.trim().toLowerCase();
        cityStops = this.allStops().filter(
          (s) => s.city?.trim().toLowerCase() === targetCity
        );
      }
      if (cityStops.length === 0 && this.allStops().length > 0) {
        cityStops = [...this.allStops()];
      }
      if (cityStops.length > 0) {
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

        this.hotelBusStop.set(closestStop);
        this.hotelBusDistance.set(minDistance);
        return;
      }

      this.destinationStopError.set(
        this.translate?.instant('summary.noBusStopAssociated', {
          hotel: hotel.name,
          area: hotel.city || this.translate?.instant('summary.thisArea') || 'this area'
        }) || `No bus stop is currently associated with ${hotel.name} in ${hotel.city || 'this area'}.`
      );
    } catch (e) {
      console.warn('Could not resolve hotel bus stop:', e);
    }
  }

  async onOriginStopChange(originId: number | null): Promise<void> {
    this.selectedOriginStopId.set(originId);
    this.bookingState.setOriginBusStop(originId);
    const curHotel = this.effectiveHotel();
    if (curHotel && !this.hotelBusStop()) {
      await this.resolveHotelBusStop(curHotel);
    }
    if (originId) {
      await this.fetchRecommendations();
    } else {
      this.outgoingTrips.set([]);
      this.returnTrips.set([]);
      this.hasSearchedTrips.set(false);
    }
  }

  async fetchRecommendations(): Promise<void> {
    const originId = this.selectedOriginStopId();
    if (!originId) {
      return;
    }

    let hotel = this.effectiveHotel();
    if (!hotel && typeof window !== 'undefined') {
      try {
        const match = window.location.pathname.match(/\/hotels\/(\d+)/);
        if (match && match[1]) {
          const hId = parseInt(match[1], 10);
          if (hId && this.hotelService) {
            hotel = await firstValueFrom(this.hotelService.getHotelById(hId).pipe(catchError(() => of(null))));
          }
        }
      } catch { }
    }

    let destStop = this.hotelBusStop();
    if (!destStop && hotel) {
      await this.resolveHotelBusStop(hotel);
      destStop = this.hotelBusStop();
    }

    let rawCheckIn = (this.effectiveCheckIn() || '').trim();

    // Fallback 1: Query parameters in URL
    if (!rawCheckIn && typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        rawCheckIn = (urlParams.get('checkIn') || urlParams.get('checkInDate') || '').trim();
      } catch { }
    }

    // Fallback 2: Check input on hotel-details page DOM
    if (!rawCheckIn && typeof document !== 'undefined') {
      const inEl = document.getElementById('main-checkin') as HTMLInputElement | null;
      if (inEl && inEl.value) {
        rawCheckIn = inEl.value.trim();
      }
    }

    // Fallback 3: sessionStorage drafts
    if (!rawCheckIn && typeof sessionStorage !== 'undefined') {
      try {
        const rawState = sessionStorage.getItem('travelease_booking_summary_state');
        if (rawState) {
          const parsed = JSON.parse(rawState);
          rawCheckIn = (parsed?.checkIn || parsed?.hotel?.checkIn || '').trim();
        }
      } catch { }
    }

    // Fallback 4: Default to today's date so search NEVER fails
    if (!rawCheckIn) {
      const today = new Date();
      rawCheckIn = today.toISOString().split('T')[0];
    }

    // Synchronize to booking state if missing
    if (!this.bookingState.checkIn()) {
      const checkInD = new Date(rawCheckIn);
      const nextD = new Date(checkInD);
      nextD.setDate(nextD.getDate() + 1);
      const defaultOut = nextD.toISOString().split('T')[0];
      this.bookingState.setStayDates(rawCheckIn, this.bookingState.checkOut() || defaultOut);
    }

    const checkInDate = rawCheckIn.includes('T') ? rawCheckIn.split('T')[0] : rawCheckIn.includes(' ') ? rawCheckIn.split(' ')[0] : rawCheckIn;

    let rawCheckOut = (this.effectiveCheckOut() || '').trim();
    if (!rawCheckOut && typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        rawCheckOut = (urlParams.get('checkOut') || urlParams.get('checkOutDate') || '').trim();
      } catch { }
    }
    if (!rawCheckOut && typeof document !== 'undefined') {
      const outEl = document.getElementById('main-checkout') as HTMLInputElement | null;
      if (outEl && outEl.value) {
        rawCheckOut = outEl.value.trim();
      }
    }
    const checkOutDate = rawCheckOut ? (rawCheckOut.includes('T') ? rawCheckOut.split('T')[0] : rawCheckOut.includes(' ') ? rawCheckOut.split(' ')[0] : rawCheckOut) : '';

    if (destStop && Number(originId) === Number(destStop.id)) {
      const alternate = this.allStops().find((s) => Number(s.id) !== Number(originId) && (!hotel?.city || s.city?.trim().toLowerCase() === hotel.city.trim().toLowerCase()));
      if (alternate) {
        destStop = alternate;
        this.hotelBusStop.set(alternate);
      } else {
        this.tripsSearchError.set(this.translate?.instant('summary.sameStopError') || 'Departure stop cannot be the same as the hotel arrival stop.');
        this.outgoingTrips.set([]);
        this.returnTrips.set([]);
        this.hasSearchedTrips.set(true);
        return;
      }
    }

    this.isLoadingTrips.set(true);
    this.tripsSearchError.set(null);
    this.hasSearchedTrips.set(true);

    try {
      // 1. Fetch all routes
      let allRoutes: BusRouteDTO[] = [];
      try {
        allRoutes = await firstValueFrom(
          this.busRouteService.getAllBusRoutesCatalog().pipe(
            catchError(() => of([] as BusRouteDTO[]))
          )
        );
      } catch {
        allRoutes = [];
      }
      if (!allRoutes || allRoutes.length === 0) {
        try {
          const routesPage = await firstValueFrom(
            this.busRouteService.getAllBusRoutes({ size: 1000 }).pipe(
              catchError(() => of({ content: [] as BusRouteDTO[] }))
            )
          );
          allRoutes = routesPage?.content || [];
        } catch {
          allRoutes = [];
        }
      }

      const originStopObj = this.allStops().find((s) => Number(s.id) === Number(originId)) || null;
      const originCity = originStopObj?.city?.trim().toLowerCase();
      const targetCity = (hotel?.city || destStop?.city || '').trim().toLowerCase();

      // Multi-level route matching
      let outgoingRoutes = allRoutes.filter(
        (r) => Number(r.originStopId) === Number(originId) && (destStop ? Number(r.destinationStopId) === Number(destStop.id) : false)
      );

      if (outgoingRoutes.length === 0 && targetCity) {
        const destCityStopIds = new Set(
          this.allStops()
            .filter((s) => s.city?.trim().toLowerCase() === targetCity)
            .map((s) => Number(s.id))
        );
        outgoingRoutes = allRoutes.filter(
          (r) => Number(r.originStopId) === Number(originId) && destCityStopIds.has(Number(r.destinationStopId))
        );
      }

      if (outgoingRoutes.length === 0 && originCity && targetCity) {
        const originCityStopIds = new Set(
          this.allStops()
            .filter((s) => s.city?.trim().toLowerCase() === originCity)
            .map((s) => Number(s.id))
        );
        const destCityStopIds = new Set(
          this.allStops()
            .filter((s) => s.city?.trim().toLowerCase() === targetCity)
            .map((s) => Number(s.id))
        );
        outgoingRoutes = allRoutes.filter(
          (r) => originCityStopIds.has(Number(r.originStopId)) && destCityStopIds.has(Number(r.destinationStopId))
        );
      }

      if (outgoingRoutes.length === 0) {
        outgoingRoutes = allRoutes.filter((r) => Number(r.originStopId) === Number(originId));
      }

      // Return routes matching
      let returnRoutes = allRoutes.filter(
        (r) => (destStop ? Number(r.originStopId) === Number(destStop.id) : false) && Number(r.destinationStopId) === Number(originId)
      );

      if (returnRoutes.length === 0 && targetCity) {
        const destCityStopIds = new Set(
          this.allStops()
            .filter((s) => s.city?.trim().toLowerCase() === targetCity)
            .map((s) => Number(s.id))
        );
        returnRoutes = allRoutes.filter(
          (r) => destCityStopIds.has(Number(r.originStopId)) && Number(r.destinationStopId) === Number(originId)
        );
      }

      if (returnRoutes.length === 0 && originCity && targetCity) {
        const originCityStopIds = new Set(
          this.allStops()
            .filter((s) => s.city?.trim().toLowerCase() === originCity)
            .map((s) => Number(s.id))
        );
        const destCityStopIds = new Set(
          this.allStops()
            .filter((s) => s.city?.trim().toLowerCase() === targetCity)
            .map((s) => Number(s.id))
        );
        returnRoutes = allRoutes.filter(
          (r) => destCityStopIds.has(Number(r.originStopId)) && originCityStopIds.has(Number(r.destinationStopId))
        );
      }

      if (returnRoutes.length === 0) {
        returnRoutes = allRoutes.filter((r) => Number(r.destinationStopId) === Number(originId));
      }

      // ── Calculate Outgoing Trips ──────────────────────────────
      let outRequests: Observable<PageBusTripDTO>[];
      if (outgoingRoutes.length > 0) {
        outRequests = outgoingRoutes.map((route) =>
          this.busTripService.getAllBusTrips({
            routeId: route.id,
            departureAfter: `${checkInDate}T00:00:00`,
            departureBefore: `${checkInDate}T23:59:59`,
            status: 'SCHEDULED',
            size: 50,
          }).pipe(catchError(() => of({ content: [] as BusTripDTO[], totalElements: 0, totalPages: 0, size: 50, number: 0 })))
        );
      } else {
        outRequests = [
          this.busTripService.getAllBusTrips({
            departureAfter: `${checkInDate}T00:00:00`,
            departureBefore: `${checkInDate}T23:59:59`,
            status: 'SCHEDULED',
            size: 100,
          }).pipe(catchError(() => of({ content: [] as BusTripDTO[], totalElements: 0, totalPages: 0, size: 100, number: 0 })))
        ];
      }

      const outPages = await firstValueFrom(forkJoin(outRequests));
      let rawOutTrips: BusTripDTO[] = outPages.flatMap((p) => p?.content || []);

      // If route-specific date query returned 0 trips, try fetching all trips for the outgoing routes
      if (rawOutTrips.length === 0 && outgoingRoutes.length > 0) {
        const fallbackRequests = outgoingRoutes.map((route) =>
          this.busTripService.getAllBusTrips({
            routeId: route.id,
            size: 50,
          }).pipe(catchError(() => of({ content: [] as BusTripDTO[], totalElements: 0, totalPages: 0, size: 50, number: 0 })))
        );
        const fbPages = await firstValueFrom(forkJoin(fallbackRequests));
        const fbTrips = fbPages.flatMap((p) => p?.content || []);
        const sameDay = fbTrips.filter((t) => {
          const d = extractLocalDateStr(t.departureTime || t.departure);
          return d === checkInDate;
        });
        if (sameDay.length > 0) {
          rawOutTrips = sameDay;
        } else if (fbTrips.length > 0) {
          rawOutTrips = fbTrips;
        }
      }

      // Auto-populate hotelBusStop from first trip if destination stop wasn't set
      if (!this.hotelBusStop() && rawOutTrips.length > 0) {
        const firstTripRoute = outgoingRoutes.find((r) => r.id === rawOutTrips[0].routeId) || allRoutes.find((r) => r.id === rawOutTrips[0].routeId);
        if (firstTripRoute?.destinationStopId) {
          const matchedDest = this.allStops().find((s) => Number(s.id) === Number(firstTripRoute.destinationStopId));
          if (matchedDest) {
            this.hotelBusStop.set(matchedDest);
            destStop = matchedDest;
          }
        }
      }

      // Filter: eligibility based on stay dates
      let eligibleOut = rawOutTrips.filter((t) => {
        let route = outgoingRoutes.find((r) => r.id === t.routeId) || allRoutes.find((r) => r.id === t.routeId);
        if (route) {
          const rOrigId = Number(route.originStopId);
          const rOrigStop = this.allStops().find((s) => s.id === rOrigId);
          const origMatch = rOrigId === Number(originId) || (originCity && rOrigStop?.city?.trim().toLowerCase() === originCity);
          if (!origMatch) {
            return false;
          }
        }
        const tDestId = route?.destinationStopId ?? destStop?.id;
        const tDestStop = (tDestId ? this.allStops().find((s) => s.id === tDestId) : null) || destStop;
        return isOutgoingEligible(
          { ...t, destinationStop: tDestStop },
          { checkIn: checkInDate, checkOut: checkOutDate },
          tDestId,
          hotel?.checkInTime
        );
      });

      // If strict filter removed all trips, fall back to any trip matching the check-in date
      if (eligibleOut.length === 0 && rawOutTrips.length > 0) {
        eligibleOut = rawOutTrips.filter((t) => {
          const dep = extractLocalDateStr(t.departureTime || t.departure);
          const arr = extractLocalDateStr(t.arrivalTime);
          return dep === checkInDate || arr === checkInDate;
        });
        if (eligibleOut.length === 0) {
          eligibleOut = [...rawOutTrips];
        }
      }

      const enrichedOut: RecommendedBusTrip[] = [];
      const distance = this.hotelBusDistance();

      for (const trip of eligibleOut) {
        const route = outgoingRoutes.find((r) => r.id === trip.routeId) || allRoutes.find((r) => r.id === trip.routeId);
        const tripDestStop = (route?.destinationStopId ? this.allStops().find((s) => s.id === route.destinationStopId) : null) || destStop;
        const bus = await this.getOrFetchBus(trip.busId);
        const availableSeats = await this.calculateAvailableSeats(trip, bus);

        const isPreferred = isOutgoingRecommended(
          { ...trip, destinationStop: tripDestStop },
          checkInDate,
          tripDestStop?.id
        );
        const timingBadgeLabel = isPreferred ? (this.translate?.instant('summary.recommended') || 'Recommended') : '';

        const tripDistance = (hotel?.latitude && hotel?.longitude && tripDestStop?.latitude && tripDestStop?.longitude)
          ? this.calculateDistance(hotel.latitude, hotel.longitude, tripDestStop.latitude, tripDestStop.longitude)
          : distance;

        enrichedOut.push({
          ...trip,
          route,
          originStop: originStopObj || undefined,
          destinationStop: tripDestStop || undefined,
          bus: bus || undefined,
          formattedDuration: this.formatDuration(trip.departureTime || trip.departure || '', trip.arrivalTime),
          isOvernight: false,
          distanceFromHotel: tripDistance,
          availableSeatsCount: availableSeats,
          minutesRelative: 0,
          isPreferredTiming: isPreferred,
          timingBadgeLabel,
        });
      }

      // Sort: Recommended trips first, then chronologically by departure time
      enrichedOut.sort((a, b) => {
        if (a.isPreferredTiming && !b.isPreferredTiming) return -1;
        if (!a.isPreferredTiming && b.isPreferredTiming) return 1;
        const aTime = new Date(a.departureTime || a.departure || 0).getTime();
        const bTime = new Date(b.departureTime || b.departure || 0).getTime();
        return aTime - bTime;
      });

      this.outgoingTrips.set(enrichedOut);

      // ── Calculate Return Trips ────────────────────────────────
      if (checkOutDate) {
        let returnRequests: Observable<PageBusTripDTO>[];
        if (returnRoutes.length > 0) {
          returnRequests = returnRoutes.map((route) =>
            this.busTripService.getAllBusTrips({
              routeId: route.id,
              departureAfter: `${checkOutDate}T00:00:00`,
              departureBefore: `${checkOutDate}T23:59:59`,
              status: 'SCHEDULED',
              size: 50,
            }).pipe(catchError(() => of({ content: [] as BusTripDTO[], totalElements: 0, totalPages: 0, size: 50, number: 0 })))
          );
        } else {
          returnRequests = [
            this.busTripService.getAllBusTrips({
              departureAfter: `${checkOutDate}T00:00:00`,
              departureBefore: `${checkOutDate}T23:59:59`,
              status: 'SCHEDULED',
              size: 100,
            }).pipe(catchError(() => of({ content: [] as BusTripDTO[], totalElements: 0, totalPages: 0, size: 100, number: 0 })))
          ];
        }

        const returnPages = await firstValueFrom(forkJoin(returnRequests));
        const rawReturnTrips: BusTripDTO[] = returnPages.flatMap((p) => p?.content || []);

        let eligibleReturn = rawReturnTrips.filter((t) => {
          let route = returnRoutes.find((r) => r.id === t.routeId) || allRoutes.find((r) => r.id === t.routeId);
          if (route) {
            const rOrigId = Number(route.originStopId);
            const rDestId = Number(route.destinationStopId);
            const rOrigStop = this.allStops().find((s) => s.id === rOrigId);
            const rDestStop = this.allStops().find((s) => s.id === rDestId);

            const origMatch = (destStop && rOrigId === Number(destStop.id)) || (targetCity && rOrigStop?.city?.trim().toLowerCase() === targetCity);
            const destMatch = rDestId === Number(originId) || (originCity && rDestStop?.city?.trim().toLowerCase() === originCity);
            if (!origMatch || !destMatch) {
              return false;
            }
          }
          const tOrigId = route?.originStopId ?? destStop?.id;
          const tOrigStop = (tOrigId ? this.allStops().find((s) => s.id === tOrigId) : null) || destStop;
          return isReturnEligible(
            { ...t, originStop: tOrigStop },
            { checkIn: checkInDate, checkOut: checkOutDate },
            tOrigId,
            hotel?.checkOutTime
          );
        });

        if (eligibleReturn.length === 0 && rawReturnTrips.length > 0) {
          eligibleReturn = rawReturnTrips.filter((t) => {
            const dep = extractLocalDateStr(t.departureTime || t.departure);
            return dep === checkOutDate;
          });
          if (eligibleReturn.length === 0) {
            eligibleReturn = [...rawReturnTrips];
          }
        }

        const enrichedReturn: RecommendedBusTrip[] = [];

        for (const trip of eligibleReturn) {
          const route = returnRoutes.find((r) => r.id === trip.routeId) || allRoutes.find((r) => r.id === trip.routeId);
          const tripOrigStop = (route?.originStopId ? this.allStops().find((s) => s.id === route.originStopId) : null) || destStop;
          const bus = await this.getOrFetchBus(trip.busId);
          const availableSeats = await this.calculateAvailableSeats(trip, bus);

          const tripDistance = (hotel?.latitude && hotel?.longitude && tripOrigStop?.latitude && tripOrigStop?.longitude)
            ? this.calculateDistance(hotel.latitude, hotel.longitude, tripOrigStop.latitude, tripOrigStop.longitude)
            : distance;

          enrichedReturn.push({
            ...trip,
            route,
            originStop: tripOrigStop || undefined,
            destinationStop: originStopObj || undefined,
            bus: bus || undefined,
            formattedDuration: this.formatDuration(trip.departureTime || trip.departure || '', trip.arrivalTime),
            isOvernight: false,
            distanceFromHotel: tripDistance,
            availableSeatsCount: availableSeats,
            minutesRelative: 0,
            isPreferredTiming: false,
            timingBadgeLabel: '',
          });
        }

        // Sort return: strictly sorted by departure time
        enrichedReturn.sort((a, b) => {
          const aTime = new Date(a.departureTime || a.departure || 0).getTime();
          const bTime = new Date(b.departureTime || b.departure || 0).getTime();
          return aTime - bTime;
        });

        this.returnTrips.set(enrichedReturn);
      } else {
        this.returnTrips.set([]);
      }
    } catch (err) {
      console.error('Recommendations calculation error:', err);
      this.tripsSearchError.set(this.translate?.instant('summary.failedBusRecs') || 'Failed to calculate bus recommendations. Please try again.');
      this.outgoingTrips.set([]);
      this.returnTrips.set([]);
    } finally {
      this.isLoadingTrips.set(false);
    }
  }

  onSelectTrip(trip: RecommendedBusTrip, direction: 'outgoing' | 'return'): void {
    this.activeTripForSeats.set(trip);
    this.activeTripDirection.set(direction);
    this.seatDialogVisible.set(true);
  }

  onSeatsConfirmed(bookings: any[]): void {
    const trip = this.activeTripForSeats();
    const direction = this.activeTripDirection();
    if (!trip) return;

    const seats: BusSeatDTO[] = bookings.map((b) => ({
      id: b.seatId || b.id,
      seatNumber: b.seatNumber || String(b.seatId),
      seatType: b.seatType || 'STANDARD',
      busId: trip.busId,
    }));

    if (direction === 'outgoing') {
      this.bookingState.selectOutgoingTrip(
        trip,
        seats,
        trip.originStop || null,
        trip.destinationStop || null,
        trip.distanceFromHotel
      );
    } else {
      this.bookingState.selectReturnTrip(
        trip,
        seats,
        trip.originStop || null,
        trip.destinationStop || null,
        trip.distanceFromHotel
      );
    }

    this.seatDialogVisible.set(false);
    this.activeTripForSeats.set(null);
  }

  onRemoveOutgoingTrip(): void {
    this.bookingState.removeOutgoingTrip();
  }

  onRemoveReturnTrip(): void {
    this.bookingState.removeReturnTrip();
  }

  onRemoveAllTransportation(): void {
    this.bookingState.clearTransportationSelection();
  }

  // ── Stage B Guest Management Handlers ───────────────────────
  getRoomAdults(roomId: number): number {
    const custom = this.effectiveCustomRoomAdults()[roomId];
    if (custom !== undefined) return custom;
    return 1;
  }

  getRoomChildren(roomId: number): ChildGuest[] {
    const ids = this.effectiveCustomRoomChildIds()[roomId];
    if (ids !== undefined) {
      return this.effectiveChildren().filter((c) => ids.includes(c.id));
    }
    return [];
  }

  canIncreaseAdults(room: RoomDTO): boolean {
    return this.getRoomRequiredCapacity(room.id) < (room.capacity || 2);
  }

  canDecreaseAdults(room: RoomDTO): boolean {
    return this.getRoomAdults(room.id) > 1;
  }

  readonly under12LimitWarning = signal<boolean>(false);

  readonly freeChildrenCount = computed<number>(() => {
    return this.bookingState.children().filter((c) => isChildFree(c.age)).length;
  });

  canAddChild(room: RoomDTO): boolean {
    if (this.freeChildrenCount() < MAX_FREE_CHILDREN_PER_BOOKING) return true;
    return this.getRoomRequiredCapacity(room.id) < (room.capacity || 2);
  }

  isChildAgeDisabled(child: ChildGuest, age: number, room: RoomDTO): boolean {
    if (age < 12) {
      const isCurrentChildFree = child.age !== null && child.age !== undefined && isChildFree(child.age);
      if (!isCurrentChildFree && this.freeChildrenCount() >= MAX_FREE_CHILDREN_PER_BOOKING) {
        return true;
      }
      return false;
    }
    if (child.age !== null && child.age >= 12 && child.age === age) return false;
    const currentTakes = child.age !== null && child.age >= 12;
    const delta = currentTakes ? 0 : 1;
    return this.getRoomRequiredCapacity(room.id) + delta > (room.capacity || 2);
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
    const nights = this.effectiveStayNights();
    if (nights === null || nights <= 0 || !room.pricePerNight) return null;
    return room.pricePerNight * nights;
  }

  onIncreaseAdults(roomId: number): void {
    const room = this.effectiveRooms().find((r) => r.id === roomId);
    if (!room || !this.canIncreaseAdults(room)) return;
    this.roomAdultsChange.emit({ roomId, delta: 1 });
    this.bookingState.updateRoomAdults(roomId, 1);
  }

  onDecreaseAdults(roomId: number): void {
    const room = this.effectiveRooms().find((r) => r.id === roomId);
    if (!room || !this.canDecreaseAdults(room)) return;
    this.roomAdultsChange.emit({ roomId, delta: -1 });
    this.bookingState.updateRoomAdults(roomId, -1);
  }

  onAddChild(roomId: number): void {
    const room = this.effectiveRooms().find((r) => r.id === roomId);
    if (!room || !this.canAddChild(room)) return;
    this.addChildToRoom.emit(roomId);
    this.bookingState.addChildToRoom(roomId);
  }

  onRemoveChild(childId: number, roomId: number): void {
    this.removeChildFromRoom.emit({ childId, roomId });
    this.bookingState.removeChildFromRoom(childId, roomId);
  }

  onChildAgeSelected(childId: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value;
    const age = val === '' ? null : parseInt(val, 10);
    const parsedAge = age !== null && !isNaN(age) ? age : null;
    const child = this.bookingState.children().find((c) => c.id === childId);
    const isCurrentChildFree = child?.age !== null && child?.age !== undefined && isChildFree(child.age);

    if (parsedAge !== null && isChildFree(parsedAge) && !isCurrentChildFree && this.freeChildrenCount() >= MAX_FREE_CHILDREN_PER_BOOKING) {
      target.value = child?.age !== null && child?.age !== undefined ? String(child.age) : '';
      this.under12LimitWarning.set(true);
      return;
    }

    this.under12LimitWarning.set(false);
    this.childAgeChange.emit({ childId, age: parsedAge });
    this.bookingState.updateChildAge(childId, parsedAge);
  }

  onRemoveRoom(roomId: number): void {
    this.removeRoom.emit(roomId);
    this.bookingState.removeRoomFromHotel(roomId);
  }

  onAutoDistribute(): void {
    this.autoDistribute.emit();
    this.bookingState.autoDistributeGuests();
  }

  onIncreaseTotalAdults(): void {
    this.increaseTotalAdults.emit();
    this.bookingState.increaseTotalAdults();
  }

  onDecreaseTotalAdults(): void {
    this.decreaseTotalAdults.emit();
    this.bookingState.decreaseTotalAdults();
  }

  onIncreaseTotalChildren(): void {
    this.increaseTotalChildren.emit();
    this.bookingState.increaseTotalChildren();
  }

  onDecreaseTotalChildren(): void {
    this.decreaseTotalChildren.emit();
    this.bookingState.decreaseTotalChildren();
  }

  // ── Stage D Actions ─────────────────────────────────────────
  onSubmit(): void {
    this.submitBooking.emit();
  }

  onSaveChanges(): void {
    const editId = this.activeEditingBookingId;
    if (!editId) return;

    const rooms = this.effectiveRooms();
    const roomIds = rooms.map((r) => r.id);
    const children = this.effectiveChildren();
    const childAges: number[] = children
      .map((c) => c.age)
      .filter((a): a is number => typeof a === 'number');
    const adults = this.effectiveAdultsCount();
    const checkIn = this.effectiveCheckIn();
    const checkOut = this.effectiveCheckOut();

    const payload: HotelBookingRequestDTO = {
      checkIn,
      checkOut,
      guests: adults + childAges.length,
      adults,
      childAges,
      roomId: roomIds[0],
      roomIds,
    };

    this.isSubmitting = true;
    this.errorMessage = null;

    this.hotelBookingService
      .updateHotelBooking(editId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.hotelBookingService.saveGuestBreakdown(editId, { adults, childAges });
          this.bookingState.setEditingBooking(null, null);
          this.bookingState.clearSummary();
          this.closeDrawer();
          this.submitBooking.emit();
          this.router.navigate(['/user/hotel-bookings'], {
            queryParams: { updatedBookingId: editId },
          });
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err?.message || this.translate?.instant('summary.failedToUpdateBooking') || 'Failed to update booking. Please verify availability and try again.';
        },
      });
  }

  onContinueToPayment(): void {
    this.continueToPayment.emit();
    this.bookingState.continueToPayment(this.router.url);
  }

  onClearSummary(): void {
    this.clearSummary.emit();
    this.bookingState.clearSummary();
    this.closeDrawer();
  }

  onReturnToBrowsingRooms(): void {
    this.closeDrawer();
    const h = this.effectiveHotel();
    if (h?.id) {
      this.router.navigate(['/hotels', h.id]);
    } else {
      this.router.navigate(['/hotels']);
    }
  }

  getRoomTypeLabel(type: roomType | string): string {
    const key = `enums.roomType.${type}`;
    const translated = this.translate?.instant(key);
    if (translated && translated !== key) {
      return translated;
    }
    switch (type) {
      case 'SINGLE': return this.translate?.instant('enums.roomType.SINGLE') || 'Single Room';
      case 'DOUBLE': return this.translate?.instant('enums.roomType.DOUBLE') || 'Double Room';
      case 'SUITE': return this.translate?.instant('enums.roomType.SUITE') || 'Suite';
      case 'DELUXE': return this.translate?.instant('enums.roomType.DELUXE') || 'Deluxe Room';
      default: return type ? (this.translate?.instant(`enums.roomType.${type}`) || type) : (this.translate?.instant('summary.standardRoom') || 'Standard Room');
    }
  }

  // ── Helper Calculations ─────────────────────────────────────
  private async getOrFetchBus(busId: number): Promise<BusDTO | null> {
    if (this.busCache.has(busId)) {
      return this.busCache.get(busId)!;
    }
    try {
      const bus = await firstValueFrom(
        this.busService.getBusById(busId).pipe(catchError(() => of(null)))
      );
      if (bus) {
        this.busCache.set(busId, bus);
      }
      return bus;
    } catch {
      return null;
    }
  }

  private async calculateAvailableSeats(trip: BusTripDTO, bus: BusDTO | null): Promise<number> {
    const totalCapacity = bus?.capacity || 40;
    try {
      const bookingsPage = await firstValueFrom(
        this.busBookingService.getBusBookingsByBusTripId(trip.id, { size: 100 }).pipe(
          catchError(() => of({ content: [] }))
        )
      );
      const activeBookings = (bookingsPage?.content || []).filter(
        (b: any) => b.status === 'CONFIRMED' || b.status === 'PENDING'
      );
      return Math.max(0, totalCapacity - activeBookings.length);
    } catch {
      return totalCapacity;
    }
  }

  private formatDuration(dep: string, arr: string): string {
    if (!dep || !arr) return '';
    const diffMs = new Date(arr).getTime() - new Date(dep).getTime();
    if (diffMs <= 0) return '';
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  private calculateDistance(lat1?: number, lon1?: number, lat2?: number, lon2?: number): number {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
      return 1.5;
    }
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }
}
