export type status = 
'SCHEDULED' |
'DEPARTED' |
'ARRIVED' |
'CANCELLED';

export interface BusTripDTO {
    id: number;
    departure: string;
    arrivalTime: string;
    price: number;
    status: status;
    busId: number;
    routeId: number;
}

export interface BusTripRequestDTO {
    departure: string;
    arrivalTime: string;
    price: number;
    status: status;
    busId: number;
    routeId: number;
}