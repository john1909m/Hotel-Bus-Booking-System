import { HotelBookingDTO } from "../Hotel/hotel-booking.model";
import { Pageable } from "./userPage.model";
import { Sort } from "./userPage.model";

export interface PageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface PageHotelBookingDTO {
  content: HotelBookingDTO[];
  page?: PageMetadata;
  totalElements?: number;
  totalPages?: number;
  last?: boolean;
  first?: boolean;
  pageable?: Pageable;
  numberOfElements?: number;
  size?: number;
  number?: number;
  sort?: Sort;
  empty?: boolean;
}

export interface HotelBookingListParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
  status?: string;
  checkInAfter?: string;
  checkInBefore?: string;
  userId?: number;
  hotelId?: number;
}

