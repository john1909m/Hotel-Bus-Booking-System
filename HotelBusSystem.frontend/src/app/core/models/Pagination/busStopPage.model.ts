import { BusStopDto } from "../Bus/bus-stop.model";
import { Pageable, Sort } from "./userPage.model";

export interface PageBusStopDTO{
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
    pageable: Pageable;
    numberOfElements: number;
    size: number;
    content: BusStopDto[];
    number: number;
    sort: Sort;
    empty: boolean;
}

export interface BusStopListParams {
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
  city?: string;
}

export interface BusStopLookupParams {
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
}

