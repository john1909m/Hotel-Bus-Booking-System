import { HotelImageDto } from './hotel_image.model';

export interface ImageUploadUrlRequest {
  hotelId: number;
  // Room type (e.g. SINGLE, DOUBLE, SUITE, DELUXE), or null for a hotel-level gallery image
  roomType?: string | null;
  // MIME content type (must be image/jpeg, image/png, or image/webp)
  contentType: string;
}

export interface ImageUploadUrlResponse {
  // Presigned PUT URL for direct storage upload
  uploadUrl: string;
  // Final public URL of the uploaded image to save with POST /api/hotels/{hotelId}/images
  publicUrl: string;
  // Validity duration in seconds
  expiresInSeconds: number;
  // HTTP method to use for upload (e.g. 'PUT')
  method?: string;
  // Headers required during the PUT upload (e.g. {'Content-Type': 'image/jpeg'})
  requiredHeaders: Record<string, string>;
}

export type UploadStep = 'idle' | 'requesting-url' | 'uploading' | 'registering' | 'completed' | 'error';

export interface UploadProgressState {
  step: UploadStep;
  progress: number; // 0 - 100 percentage
  publicUrl?: string;
  imageDto?: HotelImageDto;
  error?: string;
}