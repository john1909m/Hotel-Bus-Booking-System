import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AiChatRequest, AiChatResponse } from '../models/AI Assistant/AIChat.model';
import { AIMessage } from '../models/AI Assistant/AIMessage.model';
import { BookingDraftRequest, BookingDraftResponse } from '../models/AI Assistant/BookingDraft.model';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly apiUrl = `${environment.apiBaseUrl}/ai`;
  private readonly http = inject(HttpClient);

  /**
   * POST /ai/chat
   * Process a message with the AI assistant.
   */
  chat(request: AiChatRequest): Observable<AiChatResponse> {
    return this.http.post<AiChatResponse>(`${this.apiUrl}/chat`, request).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * GET /ai/conversations/{id}
   * Get a conversation by ID (owner only).
   */
  getConversation(id: string): Observable<AIMessage[]> {
    return this.http.get<AIMessage[]>(`${this.apiUrl}/conversations/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * POST /ai/bookings/drafts
   * Create a booking draft from the user's chosen selections.
   */
  createBookingDraft(draftRequest: BookingDraftRequest): Observable<BookingDraftResponse> {
    return this.http.post<BookingDraftResponse>(`${this.apiUrl}/bookings/drafts`, draftRequest).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * GET /ai/bookings/drafts/{id}
   * Get a booking draft by ID (owner only).
   */
  getBookingDraft(id: number): Observable<BookingDraftResponse> {
    return this.http.get<BookingDraftResponse>(`${this.apiUrl}/bookings/drafts/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * POST /ai/bookings/drafts/{id}/confirm
   * Confirm a booking draft with optional Idempotency-Key header.
   */
  confirmBookingDraft(id: number, idempotencyKey?: string): Observable<BookingDraftResponse> {
    let headers = new HttpHeaders();
    if (idempotencyKey) {
      headers = headers.set('Idempotency-Key', idempotencyKey);
    }

    return this.http.post<BookingDraftResponse>(`${this.apiUrl}/bookings/drafts/${id}/confirm`, {}, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let message = 'Something went wrong';

    if (error.error instanceof ErrorEvent) {
      message = `Client Error: ${error.error.message}`;
    } else {
      message = `Server Error [${error.status}]: ${error.message}`;
    }

    console.error(message);
    return throwError(() => new Error(message));
  }
}
