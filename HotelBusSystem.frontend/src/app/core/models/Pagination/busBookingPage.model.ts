import { BusBookingDTO } from "../Bus/bus-booking.model";
import { Pageable, Sort } from "./userPage.model";

export interface PageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface PageBusBookingDTO {
  content: BusBookingDTO[];
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

export interface BusBookingListParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
  status?: string;
  bookingDateAfter?: string;
  bookingDateBefore?: string;
  userId?: number;
  busTripId?: number;
  seatId?: number;
}