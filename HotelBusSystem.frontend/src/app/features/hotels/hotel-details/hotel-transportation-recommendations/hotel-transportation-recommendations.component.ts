import {
  Component,
  ChangeDetectionStrategy,
  inject,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, of, catchError, forkJoin } from 'rxjs';

import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';

import { BusStopService } from '../../../../core/services/bus-stop.service';
import { BusRouteService } from '../../../../core/services/bus-route.service';
import { BusTripService } from '../../../../core/services/bus-trip.service';
import { BusService } from '../../../../core/services/bus.service';
import { BusSeatService } from '../../../../core/services/bus-seat.service';
import { BusBookingService } from '../../../../core/services/bus-booking.service';
import { HotelBusStopService } from '../../../../core/services/hotel-bus-stop.service';
import { AuthService } from '../../../../core/services/auth.service';
import { BookingStateService } from '../../../../core/services/booking-state.service';

import { HotelDTO } from '../../../../core/models/Hotel/hotel.model';
import { BusStopDto } from '../../../../core/models/Bus/bus-stop.model';
import { BusRouteDTO } from '../../../../core/models/Bus/bus-route';
import { BusTripDTO } from '../../../../core/models/Bus/bus-trip.model';
import { BusDTO } from '../../../../core/models/Bus/bus.model';
import { BusSeatDTO } from '../../../../core/models/Bus/bus-seat.model';
import { HotelBusStopDTO } from '../../../../core/models/Hotel/hotel-bus-stop.model';
import { EnrichedBusTrip } from '../../../buses/bus-search-results/bus-search-results';
import { BusSeatSelectionComponent } from '../../../buses/bus-seat-selection/bus-seat-selection.component';
import {
  isOutgoingEligible,
  isOutgoingRecommended,
  getOutgoingTimingBadge,
} from '../../../../core/utils/bus-eligibility.util';

export interface RecommendedBusTrip extends EnrichedBusTrip {
  distanceFromHotel: number | null;
  availableSeatsCount: number;
  minutesBeforeCheckIn: number;
  isPreferredTiming: boolean; // Arriving ~30-60 min before check-in
  timingBadgeLabel: string;
}

export interface BusStopOption {
  label: string;
  value: number; // bus stop ID
  stop: BusStopDto;
}

@Component({
  selector: 'app-hotel-transportation-recommendations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe,
    SelectModule,
    ButtonModule,
    TagModule,
    SkeletonModule,
    BusSeatSelectionComponent,
  ],
  templateUrl: './hotel-transportation-recommendations.component.html',
  styleUrl: './hotel-transportation-recommendations.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelTransportationRecommendationsComponent implements OnInit, OnChanges {
  private readonly busStopService = inject(BusStopService);
  private readonly busRouteService = inject(BusRouteService);
  private readonly busTripService = inject(BusTripService);
  private readonly busService = inject(BusService);
  private readonly busSeatService = inject(BusSeatService);
  private readonly busBookingService = inject(BusBookingService);
  private readonly hotelBusStopService = inject(HotelBusStopService);
  private readonly authService = inject(AuthService);
  readonly bookingStateService = inject(BookingStateService);

  @Input({ required: true }) hotel: HotelDTO | null = null;
  @Input({ required: true }) checkInDate: string = '';
  @Input() checkInTime: string = '14:00';
  @Input() guestsCount: number = 2;

  // Selected Origin State
  readonly selectedOriginStopId = signal<number | null>(null);
  readonly busStopOptions = signal<BusStopOption[]>([]);
  readonly allStops = signal<BusStopDto[]>([]);

  // Hotel Bus Stop Resolution
  readonly hotelBusStop = signal<BusStopDto | null>(null);
  readonly hotelBusDistance = signal<number | null>(null);
  readonly destinationStopError = signal<string | null>(null);

  // Recommendations State
  readonly isLoadingTrips = signal<boolean>(false);
  readonly recommendedTrips = signal<RecommendedBusTrip[]>([]);
  readonly hasSearched = signal<boolean>(false);
  readonly searchError = signal<string | null>(null);

  // Seat Selection Modal State
  readonly seatDialogVisible = signal<boolean>(false);
  readonly tripForSeatSelection = signal<RecommendedBusTrip | null>(null);

  // Cached data
  private readonly busCache = new Map<number, BusDTO>();

  readonly currentSelectedTransportation = computed(() => {
    return this.bookingStateService.transportationBooking();
  });

  ngOnInit(): void {
    this.loadAllBusStops();
    this.resolveHotelBusStop();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['hotel'] && this.hotel) {
      this.resolveHotelBusStop();
    }
    if ((changes['checkInDate'] || changes['checkInTime']) && this.selectedOriginStopId()) {
      this.fetchRecommendations();
    }
  }

  /**
   * Loads all active departure bus stops dynamically from the backend.
   */
  async loadAllBusStops(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.busStopService.getAllBusStops({ size: 100 }).pipe(
          catchError(() => of({ content: [] as BusStopDto[] }))
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
      console.warn('Failed to load bus stops:', err);
    }
  }

  /**
   * Identifies the bus stop associated with the current hotel.
   */
  async resolveHotelBusStop(): Promise<void> {
    if (!this.hotel?.id) return;
    this.destinationStopError.set(null);

    try {
      // 1. Try querying backend hotel-bus-stops association
      let hotelBusStops: HotelBusStopDTO[] = [];
      try {
        hotelBusStops = await firstValueFrom(
          this.hotelBusStopService.getHotelBusStopsByHotelId(this.hotel.id).pipe(
            catchError(() => of([] as HotelBusStopDTO[]))
          )
        );
      } catch {
        hotelBusStops = [];
      }

      if (hotelBusStops.length > 0) {
        const primaryAssociation = hotelBusStops[0];
        this.hotelBusDistance.set(primaryAssociation.distance);

        // Fetch the corresponding bus stop details
        const stop = await firstValueFrom(
          this.busStopService.getBusStopById(primaryAssociation.busStopId).pipe(
            catchError(() => of(null))
          )
        );
        if (stop) {
          this.hotelBusStop.set(stop);
          return;
        }
      }

      // 2. Fallback: Find closest bus stop in the same city as the hotel
      if (this.hotel.city) {
        const cityStopsPage = await firstValueFrom(
          this.busStopService.getAllBusStops({ city: this.hotel.city.trim(), size: 50 }).pipe(
            catchError(() => of({ content: [] as BusStopDto[] }))
          )
        );
        const cityStops = cityStopsPage?.content || [];
        if (cityStops.length > 0) {
          // If hotel and stops have coordinates, find the closest stop
          let closestStop = cityStops[0];
          let minDistance = this.calculateDistance(
            this.hotel.latitude,
            this.hotel.longitude,
            closestStop.latitude,
            closestStop.longitude
          );

          for (let i = 1; i < cityStops.length; i++) {
            const dist = this.calculateDistance(
              this.hotel.latitude,
              this.hotel.longitude,
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
      }

      this.destinationStopError.set(
        `No bus stop is currently associated with ${this.hotel.name} in ${this.hotel.city || 'this area'}.`
      );
    } catch (e) {
      console.warn('Could not resolve hotel bus stop:', e);
    }
  }

  /**
   * Triggered when customer selects or changes their departure bus stop.
   */
  onOriginStopChange(originId: number | null): void {
    this.selectedOriginStopId.set(originId);
    if (originId) {
      this.fetchRecommendations();
    } else {
      this.recommendedTrips.set([]);
      this.hasSearched.set(false);
    }
  }

  /**
   * Fetches, filters, and prioritizes bus trips matching origin, hotel stop, and check-in time.
   */
  async fetchRecommendations(): Promise<void> {
    const originId = this.selectedOriginStopId();
    const destStop = this.hotelBusStop();
    const checkInDate = this.checkInDate?.trim();

    if (!originId || !destStop || !checkInDate) {
      return;
    }

    if (originId === destStop.id) {
      this.searchError.set('Departure stop cannot be the same as the hotel arrival stop.');
      this.recommendedTrips.set([]);
      this.hasSearched.set(true);
      return;
    }

    this.isLoadingTrips.set(true);
    this.searchError.set(null);
    this.hasSearched.set(true);

    try {
      // 1. Fetch routes serving origin and destination
      const routesPage = await firstValueFrom(
        this.busRouteService.getAllBusRoutes({ size: 100 }).pipe(
          catchError(() => of({ content: [] as BusRouteDTO[] }))
        )
      );
      const allRoutes = routesPage?.content || [];

      // A route serves this stay if originStopId == originId and destinationStopId == destStop.id
      const matchingRoutes = allRoutes.filter(
        (r) => r.originStopId === originId && r.destinationStopId === destStop.id
      );

      if (matchingRoutes.length === 0) {
        this.recommendedTrips.set([]);
        this.isLoadingTrips.set(false);
        return;
      }

      // 2. Fetch scheduled trips for all matching routes on the hotel check-in date
      const tripRequests = matchingRoutes.map((route) =>
        this.busTripService.getAllBusTrips({
          routeId: route.id,
          departureAfter: `${checkInDate}T00:00:00`,
          departureBefore: `${checkInDate}T23:59:59`,
          status: 'SCHEDULED',
          size: 50,
        }).pipe(
          catchError(() => of({ content: [] as BusTripDTO[] }))
        )
      );

      const tripPages = await firstValueFrom(forkJoin(tripRequests));
      const rawTrips: BusTripDTO[] = tripPages.flatMap((p) => p?.content || []);

      // 3. Filter using date-based eligibility helper
      const eligibleTrips = rawTrips.filter((trip) =>
        isOutgoingEligible(
          { ...trip, destinationStop: destStop },
          { checkIn: checkInDate },
          destStop.id,
          this.checkInTime
        )
      );

      if (eligibleTrips.length === 0) {
        this.recommendedTrips.set([]);
        this.isLoadingTrips.set(false);
        return;
      }

      // 4. Enrich trips with bus info, available seat counts, and timing badges
      const originStopObj = this.allStops().find((s) => s.id === originId) || null;
      const distance = this.hotelBusDistance();

      const enrichedList: RecommendedBusTrip[] = [];

      for (const trip of eligibleTrips) {
        const route = matchingRoutes.find((r) => r.id === trip.routeId);
        const bus = await this.getOrFetchBus(trip.busId);

        // Calculate available seats
        const availableSeats = await this.calculateAvailableSeats(trip, bus);

        const isPreferred = isOutgoingRecommended(
          { ...trip, destinationStop: destStop },
          checkInDate,
          destStop.id
        );
        const timingBadgeLabel = isPreferred ? 'Recommended' : '';

        const depTimeStr = trip.departureTime || trip.departure || '';
        const arrTimeStr = trip.arrivalTime || '';
        const durationFormatted = this.formatDuration(depTimeStr, arrTimeStr);

        enrichedList.push({
          ...trip,
          route,
          originStop: originStopObj || undefined,
          destinationStop: destStop,
          bus: bus || undefined,
          formattedDuration: durationFormatted,
          isOvernight: false,
          distanceFromHotel: distance,
          availableSeatsCount: availableSeats,
          minutesBeforeCheckIn: 0,
          isPreferredTiming: isPreferred,
          timingBadgeLabel,
        });
      }

      // Sort: Recommended timing first, then by departure time
      enrichedList.sort((a, b) => {
        if (a.isPreferredTiming && !b.isPreferredTiming) return -1;
        if (!a.isPreferredTiming && b.isPreferredTiming) return 1;
        const aTime = new Date(a.departureTime || a.departure || 0).getTime();
        const bTime = new Date(b.departureTime || b.departure || 0).getTime();
        return aTime - bTime;
      });

      this.recommendedTrips.set(enrichedList);
    } catch (err) {
      console.error('Recommendations error:', err);
      this.searchError.set('Failed to calculate bus recommendations. Please try again.');
      this.recommendedTrips.set([]);
    } finally {
      this.isLoadingTrips.set(false);
    }
  }

  /**
   * Opens the interactive seat selection modal for the chosen trip.
   */
  onSelectTrip(trip: RecommendedBusTrip): void {
    this.tripForSeatSelection.set(trip);
    this.seatDialogVisible.set(true);
  }

  /**
   * Handles confirmation of selected seats from BusSeatSelectionComponent.
   */
  onSeatsConfirmed(bookings: any[]): void {
    const trip = this.tripForSeatSelection();
    if (!trip) return;

    const originStop = trip.originStop || null;
    const destStop = trip.destinationStop || null;
    const distance = (trip as RecommendedBusTrip).distanceFromHotel;

    // Convert booking objects or selected seats to BusSeatDTO
    const seats: BusSeatDTO[] = bookings.map((b) => ({
      id: b.seatId || b.id,
      seatNumber: b.seatNumber || String(b.seatId),
      seatType: b.seatType || 'STANDARD',
      busId: trip.busId,
    }));

    this.bookingStateService.setTransportationSelection(
      trip,
      seats,
      originStop,
      destStop,
      distance
    );
    this.seatDialogVisible.set(false);
  }

  /**
   * Removes current bus selection without touching hotel selection.
   */
  onRemoveTransportation(): void {
    this.bookingStateService.clearTransportationSelection();
  }

  // ── Helper Calculations ──────────────────────────────────────
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
      return 1.5; // reasonable fallback terminal distance in km
    }
    const R = 6371; // Earth radius in km
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

