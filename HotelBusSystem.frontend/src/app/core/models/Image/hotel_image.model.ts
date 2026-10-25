export interface HotelImageRequest {
  url: string;
  roomType?: string | null;
  sortOrder?: number;
}

export interface HotelImageDto {
  id: number;
  hotelId: number;
  roomType: string | null;
  url: string;
  sortOrder: number;
}

export * from './image_upload_url.model';