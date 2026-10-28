export type Status = 
  | 'CREATED' 
  | 'EXPIRED' 
  | 'CONFIRMED' 
  | 'CANCELLED';

export interface BookingDraftRequest {
  hotelId: number;
  roomId: number;
  checkInDate: string;
  checkOutDate: string;
  guests?: number;
  adults?: number;
  childAges?: number[];
  goingTripId?: number;
  goingSeatId?: number;
  returnTripId?: number;
  returnSeatId?: number;
}

export interface BookingDraftResponse {
  id: number;
  status: Status;
  expiresAt: string;
  hotelId?: number;
  hotelName?: string;
  roomId?: number;
  roomNumber?: string;
  roomType?: string;
  roomCapacity?: number;
  pricePerNight?: number;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  guests?: number;
  adults?: number;
  childAges?: number[];
  goingTripId?: number;
  goingSeatId?: number;
  goingSeatNumber?: string;
  goingSeatType?: string;
  goingTripPrice?: number;
  goingTripOrigin?: string;
  goingTripDestination?: string;
  goingTripDepartureTime?: string;
  goingTripArrivalTime?: string;
  returnTripId?: number;
  returnSeatId?: number;
  returnSeatNumber?: string;
  returnSeatType?: string;
  returnTripPrice?: number;
  returnTripOrigin?: string;
  returnTripDestination?: string;
  returnTripDepartureTime?: string;
  returnTripArrivalTime?: string;
  hotelTotal?: number;
  goingTransportPrice?: number;
  returnTransportPrice?: number;
  totalPrice?: number;
  bookingId?: number;
}
