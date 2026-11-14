export interface AnalyticsBusTripItemDto {
  tripId: number;
  routeName: string;
  departureTime: string;
  bookedSeats: number;
  totalSeats: number;
  loadFactor: number;
}

export interface AnalyticsBusTripsResponseDto {
  items: AnalyticsBusTripItemDto[];
}

