export interface BusDTO {
    id : number;
    busNumber: string;
    company: string;
    capacity: number;
    busType : string;
}

export interface BusRequestDTO {
    busNumber: string;
    company: string;
    capacity: number;
    busType : string;
}