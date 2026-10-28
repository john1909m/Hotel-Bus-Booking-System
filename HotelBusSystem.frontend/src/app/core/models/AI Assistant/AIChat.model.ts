export interface ResultItems {
  type: string;
  data: any;
}

export interface AiResult<T = any> {
  type: string;
  data: T;
}

export interface AiChatRequest {
  conversationId?: string;
  message: string;
}

export interface AiResponse {
  conversationId: string;
  message: string;
  intent: string;
  results: AiResult[];
  missingInformation: string[];
  requiresConfirmation: boolean;
  draftId?: string | number | null;
}

// Backward compatibility alias
export type AiChatResponse = AiResponse;

export interface AiMessageDto {
  role: 'user' | 'assistant' | 'system' | string;
  text: string;
}

// Matching backend HotelDto (com.spring.boot.dto.HotelDto)
export interface HotelDto {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  checkInTime?: string;
  checkOutTime?: string;
  coverImageUrl?: string;
  minPrice?: number;
  starRating?: number;
}
export type AiHotelSummary = HotelDto;

// Matching backend BusTripInfoDto (com.spring.boot.dto.BusTripInfoDto)
export interface BusTripInfoDto {
  id: number;
  routeId?: number;
  routeName?: string;
  originCity: string;
  originStopName?: string;
  destinationCity: string;
  destinationStopName?: string;
  departureTime: string;
  arrivalTime?: string;
  price: number;
  status?: string;
  tripId?: number;
  busCompany?: string;
  availableSeats?: number;
}
export type AiBusTripSummary = BusTripInfoDto;

// Matching backend BusTripDto (com.spring.boot.dto.BusTripDto)
export interface BusTripDto {
  id: number;
  departureTime: string;
  arrivalTime?: string;
  price: number;
  status?: string;
  busId?: number;
  routeId?: number;
}

// Matching backend BusTripRecommendation
export interface BusTripRecommendation {
  outgoingTrips?: BusTripDto[];
  returnTrips?: BusTripDto[];
}

// Matching backend RoomDto (com.spring.boot.dto.RoomDto)
export interface RoomDto {
  id: number;
  roomNumber?: string;
  roomType?: string;
  capacity?: number;
  pricePerNight?: number;
  hotelId?: number;
  hotelName?: string;
}

// Matching backend UserBookingsDto (com.spring.boot.dto.UserBookingsDto)
export interface UserBookingsDto {
  hotelBookings?: any[];
  busBookings?: any[];
}

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  intent?: string;
  results?: AiResult[];
  missingInformation?: string[];
  requiresConfirmation?: boolean;
  draftId?: string | number | null;
  isError?: boolean;
  isMock?: boolean;
}
