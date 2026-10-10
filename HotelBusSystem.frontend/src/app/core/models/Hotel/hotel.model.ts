export interface HotelDTO{
    id: number;
    name: string;
    description: string;
    address: string;
    city: string;
    latitude: number;
    longtude: number;
    rating: number;
    checkInTime: string;
    checkOutTime: string;
}

export interface HotelRequestDTO{
    name: string;
    description: string;
    address: string;
    city: string;
    latitude: number;
    longtude: number;
    rating: number;
    checkInTime: string;
    checkOutTime: string;
}