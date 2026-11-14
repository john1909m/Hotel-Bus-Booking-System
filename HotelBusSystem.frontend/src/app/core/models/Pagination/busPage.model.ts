import { BusDTO } from "../Bus/bus.model";
import { Pageable, Sort } from "./userPage.model";
import { PageMetadata } from "./hotelPage.model";

export interface PageBusDTO {
  totalElements: number;
  totalPages: number;
  last?: boolean;
  first?: boolean;
  pageable?: Pageable;
  numberOfElements?: number;
  size: number;
  content: BusDTO[];
  number: number;
  sort?: Sort;
  empty?: boolean;
  page?: PageMetadata;
}

export interface BusListParams {
  page?: number;
  size?: number;
  sort?: string;
  sortBy?: string;
  sortDirection?: string;
  q?: string;
  busType?: string;
  company?: string;
}

export interface BusLookupParams {
  q?: string;
}
