import {  RoomSummaryDto } from "../Room/room.model";

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
    adults?: number;
    childAges?: number[];
    status : status;
    totalPrice : number;
    userId: number;
    roomId : number;
    hotelId: number;
    hotelName: string;
    rooms?: RoomSummaryDto[];                
}

export interface HotelBookingRequestDTO{
    checkIn : string;
    checkOut : string;
    guests : number;
    adults?: number;
    childAges?: number[];
    roomId : number;
    roomIds? : number[];
}

export interface StatusUpdateRequestDTO {
    status: status;
}

