import { BusRouteDTO } from "../Bus/bus-route";
import { Pageable, Sort } from "./userPage.model";

export interface PageBusRouteDTO{
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
    pageable: Pageable;
    numberOfElements: number;
    size: number;
    content: BusRouteDTO[];
    number: number;
    sort: Sort;
    empty: boolean;
}
