export interface BookingDraftRequest{
    hotelId: number;
    roomId: number;
    checkInDate: string;
    checkOutDate: string;
    guests: number;
    goingTripId: number;
    goingSeatId: number;
    returnTripId: number;
    returnSeatId: number;
}