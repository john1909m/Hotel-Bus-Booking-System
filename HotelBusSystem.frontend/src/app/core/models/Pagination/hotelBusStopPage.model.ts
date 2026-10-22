import { HotelBusStopDTO } from "../Hotel/hotel-bus-stop.model";
import { Pageable } from "./userPage.model";
import { Sort } from "./userPage.model";

export interface PageHotelBusStopDTO{
    content: HotelBusStopDTO[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

export interface HotelBusStopListParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
  q?: string;
  hotelId?: string;
  busStopId?: string;
}

