import { BusRouteDTO } from "../Bus/bus-route";
import { Pageable, Sort } from "./userPage.model";

export interface PageBusRouteDTO {
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
    size: number;
    content: BusRouteDTO[];
    page?: number;
    number?: number;
    pageable?: Pageable;
    numberOfElements?: number;
    sort?: Sort;
    empty?: boolean;
}

export interface BusRouteListParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
  originStopId?: number;
  destinationStopId?: number;
}

export interface BusRouteLookupParams {
  q?: string;
}
