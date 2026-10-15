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
