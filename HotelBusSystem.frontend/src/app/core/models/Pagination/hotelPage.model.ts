import { HotelDTO } from "../Hotel/hotel.model";
import { Pageable } from "./userPage.model";
import { Sort } from "./userPage.model";

export interface PageHotelDTO{
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
    pageable: Pageable;
    numberOfElements: number;
    size: number;
    content: HotelDTO[];
    number: number;
    sort: Sort;
    empty: boolean;
}