import { BusDTO } from "../Bus/bus.model";
import { Pageable } from "./userPage.model";
import { Sort } from "./userPage.model";

export interface PageBusDTO{
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
    pageable: Pageable;
    numberOfElements: number;
    size: number;
    content: BusDTO[];
    number: number;
    sort: Sort;
    empty: boolean;
}

export interface BusListParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface BusLookupParams {
  q?: string;
}