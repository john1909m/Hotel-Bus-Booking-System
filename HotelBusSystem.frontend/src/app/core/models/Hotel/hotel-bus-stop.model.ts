export interface HotelBusStopDTO{
    id: number;
    distance: number;
    hotelId: number;
    busStopId: number;
}

export interface HotelBusStopRequestDTO{
    distance: number;
    hotelId: number;
    busStopId: number;
}