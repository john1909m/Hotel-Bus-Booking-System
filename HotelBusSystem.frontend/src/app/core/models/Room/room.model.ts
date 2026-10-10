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
}

export interface RoomRequestDTO{
    roomNumber: string;
    roomType: roomType;
    capacity: number;
    pricePerNight: number;
    hotelId: number;
}

