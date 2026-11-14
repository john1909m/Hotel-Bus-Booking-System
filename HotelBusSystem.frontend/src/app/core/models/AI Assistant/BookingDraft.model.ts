export type DraftStatus = 'CREATED' | 'EXPIRED' | 'CONFIRMED' | 'CANCELLED';
export type Status = DraftStatus; // Backward compatibility alias

export interface DraftRoomSnapshotDto {
  roomId?: number;
  roomNumber?: string;
  roomType?: string;
  capacity?: number;
  pricePerNight?: number;
}

export interface DraftSeatSnapshotDto {
  seatId?: number;
  seatNumber?: string;
  seatType?: string;
}

export interface BookingDraftRequest {
  hotelId: number;
  roomId?: number;
  roomIds?: number[];
  checkInDate: string;
  checkOutDate: string;
  guests?: number;
  adults?: number;
  childAges?: number[];
  goingTripId?: number;
  goingSeatId?: number;
  goingSeatIds?: number[];
  returnTripId?: number;
  returnSeatId?: number;
  returnSeatIds?: number[];
  transportPassengers?: number;
}

export interface BookingDraftResponse {
  id: number;
  status: DraftStatus;
  expiresAt: string;

  // Hotel info
  hotelId?: number;
  hotelName?: string;

  // Legacy single room info (deprecated fallback)
  roomId?: number;
  roomNumber?: string;
  roomType?: string;
  roomCapacity?: number;
  pricePerNight?: number;

  // Multi-room info
  roomIds?: number[];
  rooms?: DraftRoomSnapshotDto[];

  // Dates and guests
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  guests?: number;
  adults?: number;
  childAges?: number[];

  // Going trip info
  goingTripId?: number;
  goingSeatId?: number;
  goingSeatNumber?: string;
  goingSeatType?: string;
  goingTripPrice?: number;
  goingTripOrigin?: string;
  goingTripDestination?: string;
  goingTripDepartureTime?: string;
  goingTripArrivalTime?: string;
  goingSeatIds?: number[];
  goingSeats?: DraftSeatSnapshotDto[];

  // Return trip info
  returnTripId?: number;
  returnSeatId?: number;
  returnSeatNumber?: string;
  returnSeatType?: string;
  returnTripPrice?: number;
  returnTripOrigin?: string;
  returnTripDestination?: string;
  returnTripDepartureTime?: string;
  returnTripArrivalTime?: string;
  returnSeatIds?: number[];
  returnSeats?: DraftSeatSnapshotDto[];

  transportPassengers?: number;

  // Pricing breakdown
  hotelTotal?: number;
  goingTransportPrice?: number;
  returnTransportPrice?: number;
  totalPrice?: number;

  // Booking IDs after confirmation
  bookingId?: number;
  busBookingIds?: number[];
}
