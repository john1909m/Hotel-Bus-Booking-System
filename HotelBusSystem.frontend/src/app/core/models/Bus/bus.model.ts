import { BusFeatureDto } from './bus-feature.model';

export interface BusDTO {
    id : number;
    busNumber: string;
    company: string;
    capacity: number;
    busType : string;
    priceFactor?: number;
    features?: BusFeatureDto[];
}

export interface BusRequestDTO {
    busNumber: string;
    company: string;
    capacity: number;
    busType : string;
}
