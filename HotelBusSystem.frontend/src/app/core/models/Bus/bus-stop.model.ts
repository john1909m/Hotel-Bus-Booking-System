export interface BusStopDto {
    id: number;
    name: string;
    city: string;
    address: string;
    latitude: number;
    longitude: number;
}

export interface BusStopRequestDto {
    name: string;
    city: string;
    address: string;
    latitude: number;
    longitude: number;
}