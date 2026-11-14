import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { handleError } from '../utils/ErrorHandling';

// Models
import { AnalyticsSummaryDto } from '../models/Dashboard/summary.model';
import {
  AnalyticsRevenueResponseDto,
  RevenueGranularity,
} from '../models/Dashboard/revenue.model';
import {
  AnalyticsBookingsResponseDto,
  AnalyticsBookingStatusResponseDto,
  BookingsGranularity,
  BookingAnalyticsType,
  BookingStatus,
} from '../models/Dashboard/bookings.model';
import {
  AnalyticsTopHotelsResponseDto,
  AnalyticsOccupancyResponseDto,
  TopHotelsSortBy,
} from '../models/Dashboard/hotels-analytics.model';
import { AnalyticsBusTripsResponseDto } from '../models/Dashboard/bus-analytics.model';
import { AnalyticsPaymentsResponseDto } from '../models/Dashboard/payments-analytics.model';

export interface AnalyticsDateRangeParams {
  from?: string;
  to?: string;
}

export interface RevenueTrendsParams extends AnalyticsDateRangeParams {
  granularity: RevenueGranularity;
}

export interface BookingsTrendsParams extends AnalyticsDateRangeParams {
  granularity: BookingsGranularity;
  type?: BookingAnalyticsType;
  status?: BookingStatus;
}

export interface BookingsByStatusParams extends AnalyticsDateRangeParams {
  type?: BookingAnalyticsType;
}

export interface TopHotelsParams extends AnalyticsDateRangeParams {
  limit?: number;
  sortBy?: TopHotelsSortBy;
}

export interface OccupancyParams extends AnalyticsDateRangeParams {
  hotelId?: number;
}

export interface BusTripsAnalyticsParams extends AnalyticsDateRangeParams {
  routeId?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/admin/analytics`;
  private readonly http = inject(HttpClient);

  /**
   * Helper to build HttpParams with optional date range and extra parameters.
   * If both from and to are present, they are added. If either is missing, neither is added,
   * allowing the backend to default safely to the last 30 days without triggering validation errors.
   */
  private buildParams(baseParams?: AnalyticsDateRangeParams, extras?: Record<string, any>): HttpParams {
    let params = new HttpParams();

    if (baseParams?.from && baseParams?.to) {
      params = params.set('from', baseParams.from);
      params = params.set('to', baseParams.to);
    }

    if (extras) {
      for (const [key, value] of Object.entries(extras)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      }
    }

    return params;
  }

  /**
   * GET /api/admin/analytics/summary
   * High-level summary KPIs (counts and revenue).
   */
  getSummary(params?: AnalyticsDateRangeParams): Observable<AnalyticsSummaryDto> {
    const httpParams = this.buildParams(params);
    return this.http.get<AnalyticsSummaryDto>(`${this.apiUrl}/summary`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /api/admin/analytics/revenue
   * Revenue trends grouped by DAY, WEEK, or MONTH.
   */
  getRevenueTrends(params: RevenueTrendsParams): Observable<AnalyticsRevenueResponseDto> {
    const httpParams = this.buildParams(params, { granularity: params.granularity });
    return this.http.get<AnalyticsRevenueResponseDto>(`${this.apiUrl}/revenue`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /api/admin/analytics/bookings
   * Booking volume trends over time grouped by DAY, WEEK, or MONTH.
   */
  getBookingsTrends(params: BookingsTrendsParams): Observable<AnalyticsBookingsResponseDto> {
    const httpParams = this.buildParams(params, {
      granularity: params.granularity,
      type: params.type,
      status: params.status,
    });
    return this.http.get<AnalyticsBookingsResponseDto>(`${this.apiUrl}/bookings`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /api/admin/analytics/bookings/status
   * Booking counts grouped by lifecycle status (PENDING, CONFIRMED, CANCELLED, COMPLETED).
   */
  getBookingsByStatus(params?: BookingsByStatusParams): Observable<AnalyticsBookingStatusResponseDto> {
    const httpParams = this.buildParams(params, { type: params?.type });
    return this.http.get<AnalyticsBookingStatusResponseDto>(`${this.apiUrl}/bookings/status`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /api/admin/analytics/hotels/top
   * Top performing hotels ranked by REVENUE or BOOKINGS.
   */
  getTopHotels(params?: TopHotelsParams): Observable<AnalyticsTopHotelsResponseDto> {
    const httpParams = this.buildParams(params, {
      limit: params?.limit,
      sortBy: params?.sortBy,
    });
    return this.http.get<AnalyticsTopHotelsResponseDto>(`${this.apiUrl}/hotels/top`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /api/admin/analytics/occupancy
   * Hotel room occupancy rates and sold/available room-nights.
   */
  getOccupancy(params?: OccupancyParams): Observable<AnalyticsOccupancyResponseDto> {
    const httpParams = this.buildParams(params, { hotelId: params?.hotelId });
    return this.http.get<AnalyticsOccupancyResponseDto>(`${this.apiUrl}/occupancy`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /api/admin/analytics/bus-trips
   * Bus trips load factors and seat utilization.
   */
  getBusTrips(params?: BusTripsAnalyticsParams): Observable<AnalyticsBusTripsResponseDto> {
    const httpParams = this.buildParams(params, {
      routeId: params?.routeId,
      limit: params?.limit,
    });
    return this.http.get<AnalyticsBusTripsResponseDto>(`${this.apiUrl}/bus-trips`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /api/admin/analytics/payments
   * Payment transaction breakdown grouped by payment method and status.
   */
  getPayments(params?: AnalyticsDateRangeParams): Observable<AnalyticsPaymentsResponseDto> {
    const httpParams = this.buildParams(params);
    return this.http.get<AnalyticsPaymentsResponseDto>(`${this.apiUrl}/payments`, { params: httpParams }).pipe(
      catchError(handleError)
    );
  }
}

