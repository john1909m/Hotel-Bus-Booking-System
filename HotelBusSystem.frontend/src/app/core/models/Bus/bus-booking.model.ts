export type Status = 
'PENDING'|
'CONFIRMED' |
'CANCELLED' |
'COMPLETED';

export interface BusBookingDTO {
    id : number;
    bookingDate : string;
    status : Status;
    price : number;
    userId : number;
    busTripId : number;
    seatId : number;
}

export interface BusBookingRequestDTO {
    bookingDate : string;
    status : Status;
    price : number;
    userId : number;
    busTripId : number;
    seatId : number;
}