import { BusTripDTO } from "../Bus/bus-trip.model";
import { Pageable, Sort } from "./userPage.model";

export interface PageBusTripDTO{
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
    pageable: Pageable;
    numberOfElements: number;
    size: number;
    content: BusTripDTO[];
    number: number;
    sort: Sort;
    empty: boolean;
}
