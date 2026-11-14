export type TopHotelsSortBy = 'REVENUE' | 'BOOKINGS';

export interface AnalyticsTopHotelItemDto {
  hotelId: number;
  hotelName: string;
  city: string;
  bookings: number;
  revenue: number;
}

export interface AnalyticsTopHotelsResponseDto {
  items: AnalyticsTopHotelItemDto[];
}

export interface AnalyticsOccupancyItemDto {
  hotelId: number;
  hotelName: string;
  roomNightsSold: number;
  roomNightsAvailable: number;
  occupancyRate: number;
}

export interface AnalyticsOccupancyResponseDto {
  items: AnalyticsOccupancyItemDto[];
}
