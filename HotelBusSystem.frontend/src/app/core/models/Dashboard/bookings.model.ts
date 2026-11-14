export type BookingsGranularity = 'DAY' | 'WEEK' | 'MONTH';
export type BookingAnalyticsType = 'HOTEL' | 'BUS';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface AnalyticsBookingPointDto {
  periodStart: string;
  count: number;
}

export interface AnalyticsBookingsResponseDto {
  granularity: string;
  points: AnalyticsBookingPointDto[];
}

export interface AnalyticsBookingStatusItemDto {
  status: BookingStatus;
  count: number;
}

export interface AnalyticsBookingStatusResponseDto {
  items: AnalyticsBookingStatusItemDto[];
}
