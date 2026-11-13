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
  SimpleChanges,
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, of, catchError, forkJoin } from 'rxjs';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';

import { BusStopService } from '../../../../core/services/bus-stop.service';
import { BusRouteService } from '../../../../core/services/bus-route.service';
import { BusTripService } from '../../../../core/services/bus-trip.service';
import { BusService } from '../../../../core/services/bus.service';
import { BusBookingService } from '../../../../core/services/bus-booking.service';
import { HotelBusStopService } from '../../../../core/services/hotel-bus-stop.service';
import { AuthService } from '../../../../core/services/auth.service';
import { BookingStateService } from '../../../../core/services/booking-state.service';

import { HotelDTO } from '../../../../core/models/Hotel/hotel.model';
import { RoomDTO, roomType } from '../../../../core/models/Room/room.model';
import { BusStopDto } from '../../../../core/models/Bus/bus-stop.model';
import { BusRouteDTO } from '../../../../core/models/Bus/bus-route';
import { BusTripDTO } from '../../../../core/models/Bus/bus-trip.model';
import { BusDTO } from '../../../../core/models/Bus/bus.model';
import { BusSeatDTO } from '../../../../core/models/Bus/bus-seat.model';
import { HotelBusStopDTO } from '../../../../core/models/Hotel/hotel-bus-stop.model';
import { EnrichedBusTrip } from '../../../buses/bus-search-results/bus-search-results';
import { BusSeatSelectionComponent } from '../../../buses/bus-seat-selection/bus-seat-selection.component';
import { ChildGuest } from '../hotel-details';
import {
  isOutgoingEligible,
  isReturnEligible,
  isOutgoingRecommended,
  getOutgoingTimingBadge,
  getReturnTimingBadge,
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
  ],
  templateUrl: './hotel-booking-summary.component.html',
  styleUrl: './hotel-booking-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelBookingSummaryComponent implements OnInit, OnChanges {
  readonly bookingState = inject(BookingStateService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

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

  onDrawerVisibleChange(val: boolean): void {
    this.bookingState.setSummaryOpen(val);
    this.visibleChange.emit(val);
    if (val) {
      const curHotel = this.effectiveHotel();
      if (curHotel && !this.hotelBusStop()) {
        this.resolveHotelBusStop(curHotel);
      } else if (this.selectedOriginStopId() && this.hotelBusStop()) {
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
      this.dateErrorMessage.set(validation.error || 'Invalid date range selected.');
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
        this.busStopService.getAllBusStops({ size: 100 }).pipe(
          catchError((err) => {
            this.stopsLoadError.set('Failed to load bus stops.');
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
      this.stopsLoadError.set('Failed to load bus stops.');
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
          if (this.selectedOriginStopId()) {
            this.fetchRecommendations();
          }
          return;
        }
      }

      // 2. Fallback: Find closest bus stop in the hotel's city
      if (hotel.city) {
        const cityStopsPage = await firstValueFrom(
          this.busStopService.getAllBusStops({ city: hotel.city.trim(), size: 50 }).pipe(
            catchError(() => of({ content: [] as BusStopDto[] }))
          )
        );
        const cityStops = cityStopsPage?.content || [];
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
          if (this.selectedOriginStopId()) {
            this.fetchRecommendations();
          }
          return;
        }
      }

      this.destinationStopError.set(
        `No bus stop is currently associated with ${hotel.name} in ${hotel.city || 'this area'}.`
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
    if (originId && this.hotelBusStop()) {
      this.fetchRecommendations();
    } else {
      this.outgoingTrips.set([]);
      this.returnTrips.set([]);
      this.hasSearchedTrips.set(false);
    }
  }

  async fetchRecommendations(): Promise<void> {
    const originId = this.selectedOriginStopId();
    const destStop = this.hotelBusStop();
    const checkInDate = this.effectiveCheckIn()?.trim();
    const checkOutDate = this.effectiveCheckOut()?.trim();
    const hotel = this.effectiveHotel();

    if (!originId || !destStop || !checkInDate) {
      return;
    }

    if (originId === destStop.id) {
      this.tripsSearchError.set('Departure stop cannot be the same as the hotel arrival stop.');
      this.outgoingTrips.set([]);
      this.returnTrips.set([]);
      this.hasSearchedTrips.set(true);
      return;
    }

    this.isLoadingTrips.set(true);
    this.tripsSearchError.set(null);
    this.hasSearchedTrips.set(true);

    try {
      // 1. Fetch all routes
      const routesPage = await firstValueFrom(
        this.busRouteService.getAllBusRoutes({ size: 100 }).pipe(
          catchError(() => of({ content: [] as BusRouteDTO[] }))
        )
      );
      const allRoutes = routesPage?.content || [];

      // Outgoing routes: originStopId == originId && destinationStopId == destStop.id
      const outgoingRoutes = allRoutes.filter(
        (r) => r.originStopId === originId && r.destinationStopId === destStop.id
      );

      // Return routes: originStopId == destStop.id && destinationStopId == originId
      const returnRoutes = allRoutes.filter(
        (r) => r.originStopId === destStop.id && r.destinationStopId === originId
      );

      // ── Calculate Outgoing Trips ──────────────────────────────
      if (outgoingRoutes.length > 0) {
        const outRequests = outgoingRoutes.map((route) =>
          this.busTripService.getAllBusTrips({
            routeId: route.id,
            departureAfter: `${checkInDate}T00:00:00`,
            departureBefore: `${checkInDate}T23:59:59`,
            status: 'SCHEDULED',
            size: 50,
          }).pipe(catchError(() => of({ content: [] as BusTripDTO[] })))
        );

        const outPages = await firstValueFrom(forkJoin(outRequests));
        const rawOutTrips: BusTripDTO[] = outPages.flatMap((p) => p?.content || []);

        // Filter: eligibility is based strictly on stay dates (check-in arrival at hotel stop)
        const eligibleOut = rawOutTrips.filter((t) =>
          isOutgoingEligible(
            { ...t, destinationStop: destStop },
            { checkIn: checkInDate, checkOut: checkOutDate },
            destStop.id,
            hotel?.checkInTime
          )
        );

        const enrichedOut: RecommendedBusTrip[] = [];
        const originStopObj = this.allStops().find((s) => s.id === originId) || null;
        const distance = this.hotelBusDistance();

        for (const trip of eligibleOut) {
          const route = outgoingRoutes.find((r) => r.id === trip.routeId);
          const bus = await this.getOrFetchBus(trip.busId);
          const availableSeats = await this.calculateAvailableSeats(trip, bus);

          const isPreferred = isOutgoingRecommended(
            { ...trip, destinationStop: destStop },
            checkInDate,
            destStop.id
          );
          const timingBadgeLabel = isPreferred ? 'Recommended' : '';

          enrichedOut.push({
            ...trip,
            route,
            originStop: originStopObj || undefined,
            destinationStop: destStop,
            bus: bus || undefined,
            formattedDuration: this.formatDuration(trip.departureTime || trip.departure || '', trip.arrivalTime),
            isOvernight: false,
            distanceFromHotel: distance,
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
      } else {
        this.outgoingTrips.set([]);
      }

      // ── Calculate Return Trips ────────────────────────────────
      if (returnRoutes.length > 0 && checkOutDate) {
        const returnRequests = returnRoutes.map((route) =>
          this.busTripService.getAllBusTrips({
            routeId: route.id,
            departureAfter: `${checkOutDate}T00:00:00`,
            departureBefore: `${checkOutDate}T23:59:59`,
            status: 'SCHEDULED',
            size: 50,
          }).pipe(catchError(() => of({ content: [] as BusTripDTO[] })))
        );

        const returnPages = await firstValueFrom(forkJoin(returnRequests));
        const rawReturnTrips: BusTripDTO[] = returnPages.flatMap((p) => p?.content || []);

        // Filter: eligibility is based strictly on stay dates (departure on check-out date from hotel stop)
        const eligibleReturn = rawReturnTrips.filter((t) =>
          isReturnEligible(
            { ...t, originStop: destStop },
            { checkIn: checkInDate, checkOut: checkOutDate },
            destStop.id,
            hotel?.checkOutTime
          )
        );

        const enrichedReturn: RecommendedBusTrip[] = [];
        const originStopObj = this.allStops().find((s) => s.id === originId) || null;
        const distance = this.hotelBusDistance();

        for (const trip of eligibleReturn) {
          const route = returnRoutes.find((r) => r.id === trip.routeId);
          const bus = await this.getOrFetchBus(trip.busId);
          const availableSeats = await this.calculateAvailableSeats(trip, bus);

          enrichedReturn.push({
            ...trip,
            route,
            originStop: destStop,
            destinationStop: originStopObj || undefined,
            bus: bus || undefined,
            formattedDuration: this.formatDuration(trip.departureTime || trip.departure || '', trip.arrivalTime),
            isOvernight: false,
            distanceFromHotel: distance,
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
      this.tripsSearchError.set('Failed to calculate bus recommendations. Please try again.');
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

  canAddChild(room: RoomDTO): boolean {
    return true; // 0-11 stay free
  }

  isChildAgeDisabled(child: ChildGuest, age: number, room: RoomDTO): boolean {
    if (age < 12) return false;
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

  onContinueToPayment(): void {
    this.continueToPayment.emit();
    this.bookingState.continueToPayment();
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
    switch (type) {
      case 'SINGLE': return 'Single Room';
      case 'DOUBLE': return 'Double Room';
      case 'SUITE': return 'Executive Suite';
      case 'DELUXE': return 'Deluxe Room';
      default: return type || 'Standard Room';
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
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
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
