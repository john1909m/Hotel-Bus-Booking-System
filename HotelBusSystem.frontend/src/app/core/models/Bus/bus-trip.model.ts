export type status = 
'SCHEDULED' |
'DEPARTED' |
'ARRIVED' |
'CANCELLED' |
'ANY';

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

export interface BusTripListParams {
  page?: number;
  size?: number;
  sort?: string;
  busId?: number;
  routeId?: number;
  status?: status;
  departureAfter?: string;
  departureBefore?: string;
}

export interface BusTripLookupParams {
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
}