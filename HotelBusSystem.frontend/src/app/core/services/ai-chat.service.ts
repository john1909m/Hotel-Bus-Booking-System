import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AiChatRequest,
  AiResponse,
  AiResult,
  AiMessageDto,
  ChatMessageItem,
  HotelDto,
  BusTripInfoDto
} from '../models/AI Assistant/AIChat.model';
import { AuthService } from './auth.service';

const STORAGE_KEY_CONV_ID = 'travelease_ai_conv_id';
const STORAGE_KEY_MOCK_MODE = 'travelease_ai_mock_mode';
const STORAGE_KEY_MESSAGES = 'travelease_ai_chat_messages';

@Injectable({
  providedIn: 'root',
})
export class AiChatService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiBaseUrl}/ai`;

  // Reactive state signals
  readonly conversationId = signal<string>(this.getInitialConversationId());
  readonly isMockMode = signal<boolean>(this.getInitialMockMode());
  readonly messages = signal<ChatMessageItem[]>(this.getInitialMessages());
  readonly isLoading = signal<boolean>(false);
  readonly lastError = signal<string | null>(null);
  readonly lastErrorCode = signal<number | null>(null);
  readonly failedMessage = signal<string | null>(null);

  constructor() {
    // Populate default greeting if history is empty
    if (this.messages().length === 0) {
      this.resetToWelcomeMessage();
    }
  }

  /**
   * Reset conversation messages to the initial greeting.
   */
  resetToWelcomeMessage(): void {
    const welcomeMsg: ChatMessageItem = {
      id: this.generateUUID(),
      sender: 'assistant',
      text: 'Hello! 👋 I am your TravelEase AI Assistant. I can help you search hotels, find available bus trips, check room details, or answer questions about your journey. How can I assist you today?',
      timestamp: new Date(),
      intent: 'GENERAL',
      isMock: this.isMockMode(),
    };
    this.messages.set([welcomeMsg]);
    this.saveMessagesToStorage([welcomeMsg]);
  }

  /**
   * Toggle Mock Mode on or off and persist setting.
   */
  toggleMockMode(forceValue?: boolean): void {
    const nextVal = forceValue !== undefined ? forceValue : !this.isMockMode();
    this.isMockMode.set(nextVal);
    try {
      localStorage.setItem(STORAGE_KEY_MOCK_MODE, String(nextVal));
    } catch {
      // Ignore local storage error
    }
    this.lastError.set(null);
    this.lastErrorCode.set(null);
  }

  /**
   * Clear active conversation and start fresh with a new UUID.
   */
  clearConversation(): void {
    const newConvId = this.generateUUID();
    this.conversationId.set(newConvId);
    try {
      sessionStorage.setItem(STORAGE_KEY_CONV_ID, newConvId);
      sessionStorage.removeItem(STORAGE_KEY_MESSAGES);
    } catch {
      // Ignore storage error
    }
    this.lastError.set(null);
    this.lastErrorCode.set(null);
    this.failedMessage.set(null);
    this.resetToWelcomeMessage();
  }

  /**
   * Send a chat message.
   * If isRetry is true, does not re-add the user prompt to avoid duplicate user bubbles.
   */
  sendMessage(content: string, isRetry = false): Observable<AiResponse> {
    const trimmed = content.trim();
    if (!trimmed) {
      return throwError(() => new Error('Message cannot be empty'));
    }

    // Prevent duplicate submissions while a request is in flight
    if (this.isLoading()) {
      return throwError(() => new Error('A request is already in progress. Please wait.'));
    }

    // 1. Add user message if this is a fresh send
    if (!isRetry) {
      const userMsg: ChatMessageItem = {
        id: this.generateUUID(),
        sender: 'user',
        text: trimmed,
        timestamp: new Date(),
      };
      const currentList = [...this.messages(), userMsg];
      this.messages.set(currentList);
      this.saveMessagesToStorage(currentList);
    } else {
      // If retrying, remove trailing assistant error bubble if present
      const list = this.messages();
      if (list.length > 0 && list[list.length - 1].isError) {
        this.messages.set(list.slice(0, -1));
      }
    }

    this.isLoading.set(true);
    this.lastError.set(null);
    this.lastErrorCode.set(null);

    // 2. Mock mode branch (explicitly isolated for testing/dev)
    if (this.isMockMode()) {
      return this.handleMockChat(trimmed).pipe(
        delay(600),
        tap((response) => {
          this.handleAssistantSuccess(response, true);
        })
      );
    }

    // 3. Live backend API branch (POST /api/ai/chat)
    const payload: AiChatRequest = {
      conversationId: this.conversationId(),
      message: trimmed,
    };

    return this.http.post<AiResponse>(`${this.apiUrl}/chat`, payload).pipe(
      tap((response) => {
        // Update and preserve backend conversation ID if returned
        if (response.conversationId) {
          this.conversationId.set(response.conversationId);
          try {
            sessionStorage.setItem(STORAGE_KEY_CONV_ID, response.conversationId);
          } catch {
            // Ignore storage error
          }
        }
        this.handleAssistantSuccess(response, false);
      }),
      catchError((err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.failedMessage.set(trimmed);
        this.lastErrorCode.set(err.status || 0);

        let errorMsg = 'Failed to connect to the AI Assistant. Please try again.';
        if (err.status === 400) {
          errorMsg = err.error?.message || 'Invalid message. Must not be empty or exceed 2000 characters.';
        } else if (err.status === 401) {
          errorMsg = 'Please sign in to chat with the TravelEase AI Assistant.';
        } else if (err.status === 403) {
          errorMsg = 'Access denied. You do not have permission to use the AI assistant.';
        } else if (err.status === 429) {
          errorMsg = 'Too many requests. Please wait a few moments before trying again.';
        } else if (err.status === 503) {
          errorMsg = 'The AI Assistant is temporarily unavailable on the server (Google Gemini API key not yet configured).';
        } else if (err.status === 500) {
          errorMsg = 'Server encountered an error processing your request. Please try again.';
        }

        this.lastError.set(errorMsg);

        // Append assistant error notification into chat
        const errorItem: ChatMessageItem = {
          id: this.generateUUID(),
          sender: 'assistant',
          text: errorMsg,
          timestamp: new Date(),
          isError: true,
        };
        const updated = [...this.messages(), errorItem];
        this.messages.set(updated);
        this.saveMessagesToStorage(updated);

        return throwError(() => err);
      })
    );
  }

  /**
   * Retry the last failed message without duplicating the user's bubble.
   */
  retryLastMessage(): Observable<AiResponse> | null {
    const msg = this.failedMessage();
    if (!msg) return null;
    return this.sendMessage(msg, true);
  }

  /**
   * Fetch conversation history from backend for authenticated user.
   */
  getConversationHistory(id: string): Observable<AiMessageDto[]> {
    return this.http.get<AiMessageDto[]>(`${this.apiUrl}/conversations/${id}`);
  }

  /**
   * Synchronize conversation messages with backend history if authenticated.
   */
  loadConversationHistory(): Observable<AiMessageDto[]> {
    const convId = this.conversationId();
    if (!convId || !this.authService.isAuthenticated() || this.isMockMode()) {
      return of([]);
    }

    return this.getConversationHistory(convId).pipe(
      tap((history) => {
        if (Array.isArray(history) && history.length > 0) {
          const mapped: ChatMessageItem[] = history.map((m) => ({
            id: this.generateUUID(),
            sender: m.role === 'user' ? 'user' : 'assistant',
            text: m.text,
            timestamp: new Date(),
            isMock: false,
          }));
          this.messages.set(mapped);
          this.saveMessagesToStorage(mapped);
        }
      }),
      catchError(() => of([]))
    );
  }

  // --- Private Helpers ---

  private handleAssistantSuccess(response: AiResponse, isMock: boolean): void {
    this.isLoading.set(false);
    this.lastError.set(null);
    this.lastErrorCode.set(null);
    this.failedMessage.set(null);

    const assistantMsg: ChatMessageItem = {
      id: this.generateUUID(),
      sender: 'assistant',
      text: response.message,
      timestamp: new Date(),
      intent: response.intent,
      results: response.results,
      missingInformation: response.missingInformation,
      requiresConfirmation: response.requiresConfirmation,
      draftId: response.draftId,
      isMock,
    };

    const updated = [...this.messages(), assistantMsg];
    this.messages.set(updated);
    this.saveMessagesToStorage(updated);
  }

  private handleMockChat(userText: string): Observable<AiResponse> {
    const textLower = userText.toLowerCase();

    // 1. Hotel search scenario
    if (textLower.includes('hotel') || textLower.includes('cairo') || textLower.includes('alexandria') || textLower.includes('stay') || textLower.includes('resort')) {
      const hotels: HotelDto[] = [
        {
          id: 1,
          name: 'Grand Nile Tower Cairo',
          city: 'Cairo',
          rating: 4.8,
          minPrice: 1850,
          address: 'Corniche El Nile, Garden City, Cairo',
        },
        {
          id: 2,
          name: 'Steigenberger Cecil Hotel',
          city: 'Alexandria',
          rating: 4.6,
          minPrice: 1450,
          address: '16 Saad Zagloul Square, Alexandria',
        },
        {
          id: 3,
          name: 'Rixos Sharm El Sheikh',
          city: 'Sharm El Sheikh',
          rating: 4.9,
          minPrice: 3200,
          address: 'Nabq Bay, Sharm El Sheikh',
        }
      ];

      return of<AiResponse>({
        conversationId: this.conversationId(),
        message: 'I found several top hotels in Egypt. Here are available recommendations with current rates and direct booking links:',
        intent: 'HOTEL_SEARCH',
        results: [
          {
            type: 'HOTEL',
            data: hotels,
          }
        ],
        missingInformation: [],
        requiresConfirmation: false,
        draftId: null,
      });
    }

    // 2. Bus trip scenario
    if (textLower.includes('bus') || textLower.includes('trip') || textLower.includes('ticket') || textLower.includes('travel') || textLower.includes('transport')) {
      const trips: BusTripInfoDto[] = [
        {
          id: 101,
          tripId: 101,
          originCity: 'Cairo',
          destinationCity: 'Alexandria',
          departureTime: '2026-11-01T08:00:00',
          arrivalTime: '2026-11-01T11:00:00',
          price: 220,
          busCompany: 'Go Bus Super Jet',
          availableSeats: 18,
        },
        {
          id: 102,
          tripId: 102,
          originCity: 'Cairo',
          destinationCity: 'Sharm El Sheikh',
          departureTime: '2026-11-01T22:30:00',
          arrivalTime: '2026-11-02T05:30:00',
          price: 450,
          busCompany: 'Blue Bus Elite VIP',
          availableSeats: 8,
        },
        {
          id: 103,
          tripId: 103,
          originCity: 'Alexandria',
          destinationCity: 'Cairo',
          departureTime: '2026-11-01T14:00:00',
          arrivalTime: '2026-11-01T17:00:00',
          price: 200,
          busCompany: 'West Delta Express',
          availableSeats: 24,
        }
      ];

      return of<AiResponse>({
        conversationId: this.conversationId(),
        message: 'Here are available bus trips matching your search. You can view trip schedules and select your seats directly:',
        intent: 'BUS_RECOMMENDATION',
        results: [
          {
            type: 'BUS_SEARCH',
            data: trips,
          }
        ],
        missingInformation: [],
        requiresConfirmation: false,
        draftId: null,
      });
    }

    // 3. User bookings scenario
    if (textLower.includes('booking') || textLower.includes('reservation') || textLower.includes('history')) {
      return of<AiResponse>({
        conversationId: this.conversationId(),
        message: 'You can view all your active and past reservations anytime in your TravelEase account. Head over to My Hotel Bookings or My Bus Bookings to check confirmation statuses and tickets.',
        intent: 'BOOKING_INQUIRY',
        results: [],
        missingInformation: [],
        requiresConfirmation: false,
        draftId: null,
      });
    }

    // 4. Missing parameters scenario
    if (textLower.includes('find') || textLower.includes('search') || textLower.includes('book')) {
      return of<AiResponse>({
        conversationId: this.conversationId(),
        message: "I'd be glad to help you find options! To provide exact recommendations, please specify:",
        intent: 'GENERAL',
        results: [],
        missingInformation: ['Destination city', 'Travel dates', 'Number of guests or seats'],
        requiresConfirmation: false,
        draftId: null,
      });
    }

    // 5. Default General conversational response
    return of<AiResponse>({
      conversationId: this.conversationId(),
      message: 'TravelEase offers hotel reservations and bus travel bookings across Egypt. Let me know what you would like to explore!',
      intent: 'GENERAL',
      results: [],
      missingInformation: [],
      requiresConfirmation: false,
      draftId: null,
    });
  }

  private getInitialConversationId(): string {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_CONV_ID);
      if (stored) return stored;
    } catch {
      // Ignore
    }
    const newId = this.generateUUID();
    try {
      sessionStorage.setItem(STORAGE_KEY_CONV_ID, newId);
    } catch {
      // Ignore
    }
    return newId;
  }

  private getInitialMockMode(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MOCK_MODE);
      // Default to false (Live API mode is primary operational mode)
      return stored === 'true';
    } catch {
      return false;
    }
  }

  private getInitialMessages(): ChatMessageItem[] {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_MESSAGES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        }
      }
    } catch {
      // Ignore
    }
    return [];
  }

  private saveMessagesToStorage(list: ChatMessageItem[]): void {
    try {
      // Store at most the last 40 messages to avoid exceeding storage
      const trimmed = list.slice(-40);
      sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(trimmed));
    } catch {
      // Ignore
    }
  }

  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
