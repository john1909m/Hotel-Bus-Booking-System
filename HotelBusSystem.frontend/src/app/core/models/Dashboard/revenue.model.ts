export type RevenueGranularity = 'DAY' | 'WEEK' | 'MONTH';

export interface AnalyticsRevenuePointDto {
  periodStart: string;
  revenue: number;
  hotelRevenue: number;
  busRevenue: number;
}

export interface AnalyticsRevenueResponseDto {
  granularity: string;
  points: AnalyticsRevenuePointDto[];
}
