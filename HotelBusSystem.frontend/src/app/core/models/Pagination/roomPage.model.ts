import { RoomDTO } from "../Room/room.model";


export interface roomPage {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface PagedModelRoomDto {
  content: RoomDTO[];
  page: roomPage;
}




export interface RoomListParams {
  page?: number;
  size?: number;
  sort?: string;
}