import { describe, it, expect } from 'vitest';
import {
  isOutgoingEligible,
  isReturnEligible,
  isOutgoingRecommended,
  getOutgoingTimingBadge,
  getReturnTimingBadge,
  extractLocalDateStr,
  extractMinutesOfDay,
} from './bus-eligibility.util';

describe('bus-eligibility.util', () => {
  const stay = {
    checkIn: '2026-11-10',
    checkOut: '2026-11-15',
  };
  const hotelBusStopId = 20;

  describe('extractLocalDateStr & extractMinutesOfDay', () => {
    it('should extract local date string correctly from ISO and space-separated datetimes', () => {
      expect(extractLocalDateStr('2026-11-10T14:30:00')).toBe('2026-11-10');
      expect(extractLocalDateStr('2026-11-10 09:15:00')).toBe('2026-11-10');
      expect(extractLocalDateStr('2026-11-10')).toBe('2026-11-10');
      expect(extractLocalDateStr(null)).toBe('');
    });

    it('should calculate minutes of day correctly', () => {
      expect(extractMinutesOfDay('2026-11-10T00:00:00')).toBe(0);
      expect(extractMinutesOfDay('2026-11-10T14:30:00')).toBe(14 * 60 + 30);
      expect(extractMinutesOfDay('2026-11-10T23:30:00')).toBe(23 * 60 + 30); // 1410 min
      expect(extractMinutesOfDay('2026-11-10T23:59:00')).toBe(23 * 60 + 59); // 1439 min
    });
  });

  describe('isOutgoingEligible', () => {
    it('accepts a trip arriving on check-in date at the hotel stop', () => {
      const trip = {
        id: 1,
        departureTime: '2026-11-10T07:00:00',
        arrivalTime: '2026-11-10T13:00:00',
        destinationStop: { id: hotelBusStopId },
        status: 'SCHEDULED',
      };

      expect(isOutgoingEligible(trip, stay, hotelBusStopId)).toBe(true);
    });

    it('rejects an outgoing trip arriving on a different date (e.g. next day)', () => {
      const trip = {
        id: 2,
        departureTime: '2026-11-10T20:00:00',
        arrivalTime: '2026-11-11T02:00:00', // arrives on next day
        destinationStop: { id: hotelBusStopId },
        status: 'SCHEDULED',
      };

      expect(isOutgoingEligible(trip, stay, hotelBusStopId)).toBe(false);
    });

    it('rejects an outgoing trip arriving at a different bus stop', () => {
      const trip = {
        id: 3,
        departureTime: '2026-11-10T07:00:00',
        arrivalTime: '2026-11-10T13:00:00',
        destinationStop: { id: 999 }, // different stop
        status: 'SCHEDULED',
      };

      expect(isOutgoingEligible(trip, stay, hotelBusStopId)).toBe(false);
    });

    it('rejects an outgoing trip departing before check-in date', () => {
      const trip = {
        id: 4,
        departureTime: '2026-11-09T22:00:00',
        arrivalTime: '2026-11-10T04:00:00',
        destinationStop: { id: hotelBusStopId },
        status: 'SCHEDULED',
      };

      expect(isOutgoingEligible(trip, stay, hotelBusStopId)).toBe(false);
    });

    it('rejects non-SCHEDULED trips', () => {
      const trip = {
        id: 5,
        departureTime: '2026-11-10T07:00:00',
        arrivalTime: '2026-11-10T13:00:00',
        destinationStop: { id: hotelBusStopId },
        status: 'CANCELLED',
      };

      expect(isOutgoingEligible(trip, stay, hotelBusStopId)).toBe(false);
    });

    it('changing checkInTime does NOT change eligibility while database times are deferred', () => {
      const trip = {
        id: 6,
        departureTime: '2026-11-10T07:00:00',
        arrivalTime: '2026-11-10T16:00:00', // arrives at 16:00 (after hypothetical 14:00 check-in)
        destinationStop: { id: hotelBusStopId },
        status: 'SCHEDULED',
      };

      // Both should evaluate to true because eligibility is strictly date-based in this phase
      expect(isOutgoingEligible(trip, stay, hotelBusStopId, '14:00')).toBe(true);
      expect(isOutgoingEligible(trip, stay, hotelBusStopId, '12:00')).toBe(true);
      expect(isOutgoingEligible(trip, stay, hotelBusStopId, '18:00')).toBe(true);
    });
  });

  describe('isReturnEligible', () => {
    it('accepts a trip departing on check-out date from the hotel stop', () => {
      const trip = {
        id: 11,
        departureTime: '2026-11-15T09:00:00',
        arrivalTime: '2026-11-15T15:00:00',
        originStop: { id: hotelBusStopId },
        status: 'SCHEDULED',
      };

      expect(isReturnEligible(trip, stay, hotelBusStopId)).toBe(true);
    });

    it('rejects a return trip departing on a date other than check-out date', () => {
      const trip = {
        id: 12,
        departureTime: '2026-11-14T09:00:00', // day before check-out
        arrivalTime: '2026-11-14T15:00:00',
        originStop: { id: hotelBusStopId },
        status: 'SCHEDULED',
      };

      expect(isReturnEligible(trip, stay, hotelBusStopId)).toBe(false);
    });

    it('rejects a return trip departing from a different bus stop', () => {
      const trip = {
        id: 13,
        departureTime: '2026-11-15T09:00:00',
        arrivalTime: '2026-11-15T15:00:00',
        originStop: { id: 999 }, // different stop
        status: 'SCHEDULED',
      };

      expect(isReturnEligible(trip, stay, hotelBusStopId)).toBe(false);
    });

    it('changing checkOutTime does NOT change eligibility while database times are deferred', () => {
      const trip = {
        id: 14,
        departureTime: '2026-11-15T08:00:00', // departs at 08:00 (before hypothetical 11:00 check-out)
        arrivalTime: '2026-11-15T14:00:00',
        originStop: { id: hotelBusStopId },
        status: 'SCHEDULED',
      };

      // Both should evaluate to true because eligibility is strictly date-based in this phase
      expect(isReturnEligible(trip, stay, hotelBusStopId, '11:00')).toBe(true);
      expect(isReturnEligible(trip, stay, hotelBusStopId, '15:00')).toBe(true);
      expect(isReturnEligible(trip, stay, hotelBusStopId, undefined)).toBe(true);
    });
  });

  describe('Recommended Badge Rules', () => {
    it('marks outgoing trips arriving at least 30 minutes before end of check-in day as Recommended', () => {
      const trip = {
        id: 21,
        departureTime: '2026-11-10T10:00:00',
        arrivalTime: '2026-11-10T16:00:00', // 16:00 <= 23:30
        destinationStop: { id: hotelBusStopId },
        status: 'SCHEDULED',
      };

      expect(isOutgoingRecommended(trip, stay, hotelBusStopId)).toBe(true);
      expect(getOutgoingTimingBadge(trip, stay, hotelBusStopId)).toBe('Recommended');
    });

    it('does NOT mark outgoing trips arriving in the final 30 minutes before midnight as Recommended', () => {
      const lateTrip = {
        id: 22,
        departureTime: '2026-11-10T18:00:00',
        arrivalTime: '2026-11-10T23:45:00', // 23:45 > 23:30
        destinationStop: { id: hotelBusStopId },
        status: 'SCHEDULED',
      };

      expect(isOutgoingRecommended(lateTrip, stay, hotelBusStopId)).toBe(false);
      expect(getOutgoingTimingBadge(lateTrip, stay, hotelBusStopId)).toBe('');
    });

    it('never marks return trips as Recommended', () => {
      expect(getReturnTimingBadge()).toBe('');
    });
  });
});

