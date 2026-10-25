export type roomType = 
'SINGLE' |
'DOUBLE' |
'SUITE' |
'DELUXE';

export interface RoomDTO{
    id: number;
    roomNumber: string;
    roomType: roomType;
    capacity: number;
    pricePerNight: number;
    hotelId: number;
    hotelName: string;
}

export interface RoomRequestDTO{
    roomNumber: string;
    roomType: roomType;
    capacity: number;
    pricePerNight: number;
    hotelId: number;
}

export interface RoomSummaryDto {
    id: number;
    roomId: number;
    roomNumber: string;
    roomType: roomType;
    pricePerNight: number;
}

