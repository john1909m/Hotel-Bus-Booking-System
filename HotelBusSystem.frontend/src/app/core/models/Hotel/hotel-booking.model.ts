export type status = 
'PENDING' |
'CONFIRMED' |
'CANCELLED' |
'COMPLETED';

export interface HotelBookingDTO{
    id: number;
    checkIn : string;
    checkOut : string;
    guests : number;
    status : status;
    totalPrice : number;
    userId: number;
    roomId : number;
    hotelId: number;
    hotelName: string;
}

export interface HotelBookingRequestDTO{
    checkIn : string;
    checkOut : string;
    guests : number;
    roomId : number;
}

