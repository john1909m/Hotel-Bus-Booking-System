import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, forkJoin, of, switchMap, map, catchError, finalize, Observable } from 'rxjs';

import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusRouteService } from '../../../core/services/bus-route.service';
import { BusTripService } from '../../../core/services/bus-trip.service';
import { BusService } from '../../../core/services/bus.service';

import { BusStopDto } from '../../../core/models/Bus/bus-stop.model';
import { BusRouteDTO } from '../../../core/models/Bus/bus-route';
import { BusTripDTO } from '../../../core/models/Bus/bus-trip.model';
import { BusDTO } from '../../../core/models/Bus/bus.model';
import { BusBookingDTO } from '../../../core/models/Bus/bus-booking.model';
import { PageBusTripDTO } from '../../../core/models/Pagination/busTripPage.model';
import { BusSeatSelectionComponent } from '../bus-seat-selection/bus-seat-selection.component';

export interface EnrichedBusTrip extends BusTripDTO {
  route?: BusRouteDTO;
  originStop?: BusStopDto;
  destinationStop?: BusStopDto;
  bus?: BusDTO;
  formattedDuration: string;
  isOvernight: boolean;
}

@Component({
  selector: 'app-bus-search-results',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    RouterLink,
    Tag,
    Toast,
    BusSeatSelectionComponent,
  ],
  providers: [MessageService],
  templateUrl: './bus-search-results.html',
  styleUrl: './bus-search-results.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusSearchResultsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly busStopService = inject(BusStopService);
  private readonly busRouteService = inject(BusRouteService);
  private readonly busTripService = inject(BusTripService);
  private readonly busService = inject(BusService);
  private readonly messageService = inject(MessageService);

  private routeSub?: Subscription;

  // Search parameters from query string
  readonly origin = signal<string>('');
  readonly destination = signal<string>('');
  readonly departureDate = signal<string>('');

  // Page states
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly paramError = signal<string | null>(null);
  readonly trips = signal<EnrichedBusTrip[]>([]);

  // Cached stops
  private allStops: BusStopDto[] = [];
  private readonly busCache = new Map<number, BusDTO>();

  // Interactive seat selection modal state
  readonly seatDialogVisible = signal<boolean>(false);
  readonly selectedTripForSeats = signal<EnrichedBusTrip | null>(null);

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe((params) => {
      const orig = params['origin']?.trim() || '';
      const dest = params['destination']?.trim() || '';
      const depDate = params['departureDate']?.trim() || '';

      this.origin.set(orig);
      this.destination.set(dest);
      this.departureDate.set(depDate);

      this.validateAndExecuteSearch(orig, dest, depDate);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  /**
   * Validates URL query parameters and triggers search if valid.
   */
  private validateAndExecuteSearch(origin: string, destination: string, departureDate: string): void {
    this.paramError.set(null);
    this.error.set(null);

    if (!origin || !destination || !departureDate) {
      this.paramError.set('Please provide an origin city, destination city, and departure date.');
      this.loading.set(false);
      this.trips.set([]);
      return;
    }

    if (origin.toLowerCase() === destination.toLowerCase()) {
      this.paramError.set('Origin and destination cannot be the same city.');
      this.loading.set(false);
      this.trips.set([]);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (departureDate < todayStr) {
      this.paramError.set('Departure date cannot be in the past.');
      this.loading.set(false);
      this.trips.set([]);
      return;
    }

    this.executeSearch(origin, destination, departureDate);
  }

  /**
   * Executes the multi-step search pipeline based on backend relational constraints.
   */
  executeSearch(originCity: string, destinationCity: string, dateStr: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.paramError.set(null);

    // Step 1: Ensure bus stops are loaded
    const stops$ = this.allStops.length > 0
      ? of(this.allStops)
      : this.busStopService.getAllBusStops({ size: 100 }).pipe(
          map((res) => res?.content || []),
          catchError((err) => {
            console.error('Failed to load bus stops:', err);
            return of([] as BusStopDto[]);
          })
        );

    stops$.pipe(
      switchMap((stops) => {
        this.allStops = stops;

        const originStops = stops.filter(
          (s) => s.city?.trim().toLowerCase() === originCity.toLowerCase()
        );
        const originStopIds = originStops.map((s) => s.id);

        const destStops = stops.filter(
          (s) => s.city?.trim().toLowerCase() === destinationCity.toLowerCase()
        );
        const destStopIds = destStops.map((s) => s.id);

        if (originStopIds.length === 0 || destStopIds.length === 0) {
          return of({ matchingRoutes: [] as BusRouteDTO[], trips: [] as BusTripDTO[] });
        }

        // Step 2: Fetch routes and filter those connecting selected cities
        return this.busRouteService.getAllBusRoutes({ size: 100 }).pipe(
          switchMap((routesPage) => {
            const allRoutes = routesPage?.content || [];
            const matchingRoutes = allRoutes.filter(
              (r) => originStopIds.includes(r.originStopId) && destStopIds.includes(r.destinationStopId)
            );

            if (matchingRoutes.length === 0) {
              return of({ matchingRoutes: [], trips: [] as BusTripDTO[] });
            }

            // Step 3: Fetch scheduled trips for all matching routes with pagination
            const tripRequests = matchingRoutes.map((r) =>
              this.fetchAllTripsForRoute(r.id, dateStr)
            );

            return forkJoin(tripRequests).pipe(
              map((tripsByRoute) => ({
                matchingRoutes,
                trips: tripsByRoute.flat(),
              }))
            );
          }),
          catchError((err) => {
            console.error('Route lookup error:', err);
            return of({ matchingRoutes: [] as BusRouteDTO[], trips: [] as BusTripDTO[] });
          })
        );
      }),
      switchMap(({ matchingRoutes, trips }) => {
        // Step 4: Eligibility filtering: must be SCHEDULED and not departed
        const nowMs = Date.now();
        const todayStr = new Date().toISOString().split('T')[0];

        const eligibleTrips = trips.filter((t) => {
          if (t.status !== 'SCHEDULED') return false;
          const depTimeStr = t.departureTime || t.departure;
          if (!depTimeStr) return false;

          if (dateStr === todayStr) {
            const tripDepMs = new Date(depTimeStr).getTime();
            if (tripDepMs <= nowMs) return false;
          }

          return true;
        });

        if (eligibleTrips.length === 0) {
          return of([] as EnrichedBusTrip[]);
        }

        // Sort chronologically by departure time
        eligibleTrips.sort((a, b) => {
          const timeA = new Date(a.departureTime || a.departure || 0).getTime();
          const timeB = new Date(b.departureTime || b.departure || 0).getTime();
          return timeA - timeB;
        });

        // Step 5: Enrich trips with route, stop, duration, and carrier info
        return this.enrichTrips(eligibleTrips, matchingRoutes);
      }),
      finalize(() => {
        this.loading.set(false);
      })
    ).subscribe({
      next: (enriched) => {
        this.trips.set(enriched);
        this.checkAndAutoOpenDraftTrip(enriched);
      },
      error: (err) => {
        console.error('Bus search execution error:', err);
        this.error.set('Failed to retrieve bus trips. Please check your network connection and try again.');
        this.trips.set([]);
      },
    });
  }

  /**
   * If customer returned from login with a preserved draft, auto-open the trip seat selection.
   */
  private checkAndAutoOpenDraftTrip(trips: EnrichedBusTrip[]): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('travelease_bus_draft_')) {
        try {
          const raw = sessionStorage.getItem(key);
          if (raw) {
            const draft = JSON.parse(raw);
            if (draft && draft.tripId) {
              const matchingTrip = trips.find((t) => t.id === draft.tripId);
              if (matchingTrip) {
                this.onSelectSeats(matchingTrip);
                break;
              }
            }
          }
        } catch (e) {
          console.warn('Could not read draft from sessionStorage:', e);
        }
      }
    }
  }

  /**
   * Retrieves all pages of trips for a route on a specific date.
   */
  private fetchAllTripsForRoute(routeId: number, depDate: string): Observable<BusTripDTO[]> {
    const departureAfter = `${depDate}T00:00:00`;
    const departureBefore = `${depDate}T23:59:59`;
    const pageSize = 50;

    return this.busTripService.getAllBusTrips({
      routeId,
      departureAfter,
      departureBefore,
      status: 'SCHEDULED',
      page: 0,
      size: pageSize,
    }).pipe(
      switchMap((firstPage: PageBusTripDTO) => {
        const trips = [...(firstPage?.content || [])];
        const totalPages = firstPage?.totalPages || 1;

        if (totalPages <= 1) {
          return of(trips);
        }

        const remainingRequests: Observable<PageBusTripDTO>[] = [];
        for (let p = 1; p < totalPages; p++) {
          remainingRequests.push(
            this.busTripService.getAllBusTrips({
              routeId,
              departureAfter,
              departureBefore,
              status: 'SCHEDULED',
              page: p,
              size: pageSize,
            })
          );
        }

        return forkJoin(remainingRequests).pipe(
          map((pages) => {
            for (const page of pages) {
              if (page?.content?.length) {
                trips.push(...page.content);
              }
            }
            return trips;
          })
        );
      }),
      catchError((err) => {
        console.warn(`Could not load trips for route #${routeId}:`, err);
        return of([] as BusTripDTO[]);
      })
    );
  }

  /**
   * Enriches trips with stops, routes, duration, and carrier information.
   */
  private enrichTrips(trips: BusTripDTO[], routes: BusRouteDTO[]): Observable<EnrichedBusTrip[]> {
    const uniqueBusIds = Array.from(new Set(trips.map((t) => t.busId).filter(Boolean)));
    const uncachedBusIds = uniqueBusIds.filter((id) => !this.busCache.has(id));

    const busRequests$ = uncachedBusIds.length > 0
      ? forkJoin(
          uncachedBusIds.map((busId) =>
            this.busService.getBusById(busId).pipe(
              catchError(() => of(null as BusDTO | null))
            )
          )
        )
      : of([]);

    return busRequests$.pipe(
      map((fetchedBuses) => {
        fetchedBuses.forEach((bus) => {
          if (bus && bus.id) {
            this.busCache.set(bus.id, bus);
          }
        });

        return trips.map((trip) => {
          const route = routes.find((r) => r.id === trip.routeId);
          const originStop = this.allStops.find((s) => s.id === route?.originStopId);
          const destinationStop = this.allStops.find((s) => s.id === route?.destinationStopId);
          const bus = this.busCache.get(trip.busId);

          const depTimeStr = trip.departureTime || trip.departure || '';
          const arrTimeStr = trip.arrivalTime || '';

          const depDate = depTimeStr ? new Date(depTimeStr) : null;
          const arrDate = arrTimeStr ? new Date(arrTimeStr) : null;

          let isOvernight = false;
          if (depDate && arrDate) {
            isOvernight = arrDate.getDate() !== depDate.getDate() || arrDate.getMonth() !== depDate.getMonth();
          }

          let formattedDuration = '';
          if (route?.duration && route.duration > 0) {
            const h = Math.floor(route.duration / 60);
            const m = route.duration % 60;
            formattedDuration = h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
          } else if (depDate && arrDate) {
            const diffMins = Math.round((arrDate.getTime() - depDate.getTime()) / 60000);
            if (diffMins > 0) {
              const h = Math.floor(diffMins / 60);
              const m = diffMins % 60;
              formattedDuration = h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
            }
          }

          return {
            ...trip,
            route,
            originStop,
            destinationStop,
            bus,
            formattedDuration: formattedDuration || 'Scheduled',
            isOvernight,
          };
        });
      })
    );
  }

  /**
   * Action when customer clicks "Modify Search".
   * Navigates back to the landing page with query parameters so the form is prefilled.
   */
  modifySearch(): void {
    this.router.navigate(['/'], {
      queryParams: {
        origin: this.origin(),
        destination: this.destination(),
        departureDate: this.departureDate(),
      },
      fragment: 'transportation',
    });
  }

  /**
   * Action when customer selects a trip.
   * Opens the interactive seat selection modal.
   */
  onSelectSeats(trip: EnrichedBusTrip): void {
    this.selectedTripForSeats.set(trip);
    this.seatDialogVisible.set(true);
  }

  closeSeatDialog(): void {
    this.seatDialogVisible.set(false);
    this.selectedTripForSeats.set(null);
  }

  onBookingComplete(bookings: BusBookingDTO[]): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Reservation Created',
      detail: `Successfully created ${bookings.length} seat reservation(s) in PENDING status.`,
      life: 6000,
    });
  }

  retrySearch(): void {
    this.executeSearch(this.origin(), this.destination(), this.departureDate());
  }
}
