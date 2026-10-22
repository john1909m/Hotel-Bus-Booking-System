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

export interface HotelListParams {
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
  city?: string;
  minRating?: number;
  maxPrice?: number;
}

export interface HotelLookupParams {
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
}

export interface PageMetadata{
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}