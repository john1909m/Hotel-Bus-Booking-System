import { BusRouteDTO } from '../models/Bus/bus-route';
import { BusStopDto } from '../models/Bus/bus-stop.model';
import { BusTripDTO } from '../models/Bus/bus-trip.model';

export interface StayDateRange {
  checkIn: string; // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD
}

export interface TripEligibilityCandidate {
  id?: number;
  routeId?: number;
  status?: string;
  departureTime?: string;
  departure?: string;
  arrivalTime?: string;
  route?: BusRouteDTO | null;
  originStop?: BusStopDto | { id: number } | null;
  destinationStop?: BusStopDto | { id: number } | null;
}

/**
 * Extracts local date string (YYYY-MM-DD) from an ISO or standard datetime string.
 */
export function extractLocalDateStr(dateTimeStr?: string | null): string {
  if (!dateTimeStr) return '';
  const clean = dateTimeStr.trim();
  if (clean.includes('T')) {
    return clean.split('T')[0];
  }
  if (clean.includes(' ')) {
    return clean.split(' ')[0];
  }
  return clean;
}

/**
 * Extracts minutes from midnight (0 to 1439) from a datetime string.
 */
export function extractMinutesOfDay(dateTimeStr?: string | null): number | null {
  if (!dateTimeStr) return null;
  const clean = dateTimeStr.trim();
  const timePart = clean.includes('T') ? clean.split('T')[1] : clean.includes(' ') ? clean.split(' ')[1] : clean;
  if (!timePart || !timePart.includes(':')) return null;
  const parts = timePart.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Evaluates whether an outgoing bus trip is eligible for a given stay.
 * Rule:
 * 1. Destination stop is the hotel's Bus Stop.
 * 2. Departure date is on or after the check-in date.
 * 3. Arrival date is on the check-in date (no later than check-in date).
 *
 * @param trip Bus trip candidate
 * @param stay Stay dates (check-in and optional check-out)
 * @param hotelBusStopId Destination hotel bus stop ID
 * @param checkInTime Optional hotel check-in time (e.g. "14:00")
 */
export function isOutgoingEligible(
  trip: TripEligibilityCandidate,
  stay: StayDateRange | string,
  hotelBusStopId?: number | null,
  checkInTime?: string
): boolean {
  if (!trip) return false;
  if (trip.status && trip.status !== 'SCHEDULED') return false;

  const depStr = trip.departureTime || trip.departure;
  const arrStr = trip.arrivalTime;
  if (!depStr || !arrStr) return false;

  const checkInDate = typeof stay === 'string' ? stay.trim() : (stay?.checkIn || '').trim();
  if (!checkInDate) return false;

  // Verify destination stop matches hotel bus stop when ID is provided
  if (hotelBusStopId !== null && hotelBusStopId !== undefined) {
    const destId = trip.destinationStop?.id ?? trip.route?.destinationStopId;
    if (destId !== undefined && destId !== hotelBusStopId) {
      return false;
    }
  }

  const depDate = extractLocalDateStr(depStr);
  const arrDate = extractLocalDateStr(arrStr);

  // Outgoing departure must be on or after check-in start of day
  if (depDate < checkInDate) {
    return false;
  }

  // Outgoing arrival must be on the check-in date (no later than check-in date)
  if (arrDate !== checkInDate) {
    return false;
  }

  // TODO: Phase - Real Hotel Check-In Time Integration
  // When real hotel check_in_time is populated and reliable in the Database,
  // evaluate arrival time against checkInTime here (e.g. arrival <= hotelCheckInTime).
  // Currently, checkInTime is ignored because database times are deferred.
  if (checkInTime) {
    // Intentionally no-op while database hotel check-in times are deferred.
  }

  return true;
}

/**
 * Evaluates whether a return bus trip is eligible for a given stay.
 * Rule:
 * 1. Departure stop is the hotel's Bus Stop.
 * 2. Departure date is the hotel's check-out date.
 *
 * @param trip Bus trip candidate
 * @param stay Stay dates (must include check-out)
 * @param hotelBusStopId Origin hotel bus stop ID
 * @param checkOutTime Optional hotel check-out time (e.g. "11:00")
 */
export function isReturnEligible(
  trip: TripEligibilityCandidate,
  stay: StayDateRange | string,
  hotelBusStopId?: number | null,
  checkOutTime?: string
): boolean {
  if (!trip) return false;
  if (trip.status && trip.status !== 'SCHEDULED') return false;

  const depStr = trip.departureTime || trip.departure;
  if (!depStr) return false;

  const checkOutDate = typeof stay === 'string' ? stay.trim() : (stay?.checkOut || '').trim();
  if (!checkOutDate) return false;

  // Verify departure stop matches hotel bus stop when ID is provided
  if (hotelBusStopId !== null && hotelBusStopId !== undefined) {
    const origId = trip.originStop?.id ?? trip.route?.originStopId;
    if (origId !== undefined && origId !== hotelBusStopId) {
      return false;
    }
  }

  const depDate = extractLocalDateStr(depStr);

  // Return departure date must be the check-out date
  if (depDate !== checkOutDate) {
    return false;
  }

  // TODO: Phase - Real Hotel Check-Out Time Integration
  // When real hotel check_out_time is populated and reliable in the Database,
  // evaluate departure time against checkOutTime here (e.g. departure >= hotelCheckOutTime).
  // Currently, checkOutTime is ignored because database times are deferred.
  if (checkOutTime) {
    // Intentionally no-op while database hotel check-out times are deferred.
  }

  return true;
}

/**
 * Evaluates whether an outgoing trip qualifies for the "Recommended" badge.
 * Rule:
 * - Recommended for outgoing trips arriving on the check-in date AND ending at least 30 minutes
 *   before the end of that day (arrival time <= 23:30).
 * - Other outgoing trips on that date are listed without the Recommended badge.
 * - Trips arriving on other dates are not eligible and not listed.
 */
export function isOutgoingRecommended(
  trip: TripEligibilityCandidate,
  stay: StayDateRange | string,
  hotelBusStopId?: number | null
): boolean {
  if (!isOutgoingEligible(trip, stay, hotelBusStopId)) {
    return false;
  }

  const arrMinutes = extractMinutesOfDay(trip.arrivalTime);
  if (arrMinutes === null) {
    return true; // Default to recommended if no time component
  }

  // End of day is 24:00 (1440 min). 30 minutes before end of day is 23:30 (1410 min).
  return arrMinutes <= 1410;
}

/**
 * Returns the timing badge label for outgoing trips.
 */
export function getOutgoingTimingBadge(
  trip: TripEligibilityCandidate,
  stay: StayDateRange | string,
  hotelBusStopId?: number | null
): string {
  return isOutgoingRecommended(trip, stay, hotelBusStopId) ? 'Recommended' : '';
}

/**
 * Return trips are never marked Recommended.
 */
export function getReturnTimingBadge(): string {
  return '';
}

