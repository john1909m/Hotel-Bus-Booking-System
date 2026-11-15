import { RoomDTO } from "../Room/room.model";

export interface roomPage {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface PagedModelRoomDto {
  content: RoomDTO[];
  page?: roomPage;
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  last?: boolean;
  first?: boolean;
  empty?: boolean;
}

export interface RoomListParams {
  page?: number;
  size?: number;
  sort?: string;
}
