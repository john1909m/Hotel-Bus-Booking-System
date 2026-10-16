import { BusBookingDTO } from "../Bus/bus-booking.model";
import { Pageable, Sort } from "./userPage.model";

export interface PageBusBookingDTO{
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
    pageable: Pageable;
    numberOfElements: number;
    size: number;
    content: BusBookingDTO[];
    number: number;
    sort: Sort;
    empty: boolean;
}
