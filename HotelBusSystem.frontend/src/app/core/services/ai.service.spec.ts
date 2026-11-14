import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';
import { AiService } from './ai.service';
import { environment } from '../../../environments/environment';
import { AiChatRequest, AiResponse } from '../models/AI Assistant/AIChat.model';
import { BookingDraftRequest, BookingDraftResponse } from '../models/AI Assistant/BookingDraft.model';

describe('AiService', () => {
  let service: AiService;
  let mockHttp: any;
  const baseUrl = `${environment.apiBaseUrl}/ai`;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: HttpClient, useValue: mockHttp },
      ],
    });

    service = runInInjectionContext(injector, () => new AiService());
  });

  it('chat should send POST to /ai/chat', () => {
    const request: AiChatRequest = {
      conversationId: 'conv-123',
      message: 'Find hotels in Cairo',
    };
    const mockResponse: AiResponse = {
      conversationId: 'conv-123',
      message: 'Here are hotels in Cairo',
      intent: 'HOTEL_SEARCH',
      results: [],
      missingInformation: [],
      requiresConfirmation: false,
      selectionRequired: false,
    };

    mockHttp.post.mockReturnValue(of(mockResponse));

    let result: AiResponse | undefined;
    service.chat(request).subscribe((res) => {
      result = res;
    });

    expect(result).toEqual(mockResponse);
    expect(mockHttp.post).toHaveBeenCalledWith(`${baseUrl}/chat`, request);
  });

  it('getConversation should send GET to /ai/conversations/{id}', () => {
    const mockMessages = [
      { role: 'user', text: 'Hello' },
      { role: 'assistant', text: 'Hi! How can I help?' },
    ];
    mockHttp.get.mockReturnValue(of(mockMessages));

    let result: any;
    service.getConversation('conv-123').subscribe((res) => {
      result = res;
    });

    expect(result).toEqual(mockMessages);
    expect(mockHttp.get).toHaveBeenCalledWith(`${baseUrl}/conversations/conv-123`);
  });

  it('createBookingDraft should send POST to /ai/bookings/drafts', () => {
    const draftReq: BookingDraftRequest = {
      hotelId: 1,
      roomIds: [101, 102],
      checkInDate: '2026-12-01',
      checkOutDate: '2026-12-05',
      adults: 3,
      childAges: [5],
      goingTripId: 10,
      goingSeatIds: [1, 2],
      transportPassengers: 2,
    };
    const mockDraftRes: BookingDraftResponse = {
      id: 501,
      status: 'CREATED',
      expiresAt: '2026-12-01T12:00:00',
      hotelId: 1,
      hotelName: 'Grand Nile Tower',
      roomIds: [101, 102],
      totalPrice: 4500,
    };

    mockHttp.post.mockReturnValue(of(mockDraftRes));

    let result: BookingDraftResponse | undefined;
    service.createBookingDraft(draftReq).subscribe((res) => {
      result = res;
    });

    expect(result).toEqual(mockDraftRes);
    expect(mockHttp.post).toHaveBeenCalledWith(`${baseUrl}/bookings/drafts`, draftReq);
  });

  it('getBookingDraft should send GET to /ai/bookings/drafts/{id}', () => {
    const mockDraftRes: BookingDraftResponse = {
      id: 501,
      status: 'CREATED',
      expiresAt: '2026-12-01T12:00:00',
      hotelId: 1,
      totalPrice: 4500,
    };

    mockHttp.get.mockReturnValue(of(mockDraftRes));

    let result: BookingDraftResponse | undefined;
    service.getBookingDraft(501).subscribe((res) => {
      result = res;
    });

    expect(result).toEqual(mockDraftRes);
    expect(mockHttp.get).toHaveBeenCalledWith(`${baseUrl}/bookings/drafts/501`);
  });

  it('confirmBookingDraft should include Idempotency-Key header when provided', () => {
    const mockDraftRes: BookingDraftResponse = {
      id: 501,
      status: 'CONFIRMED',
      expiresAt: '2026-12-01T12:00:00',
      bookingId: 888,
      busBookingIds: [991, 992],
    };

    mockHttp.post.mockReturnValue(of(mockDraftRes));

    let result: BookingDraftResponse | undefined;
    const testKey = 'test-uuid-idempotency-key-12345';
    service.confirmBookingDraft(501, testKey).subscribe((res) => {
      result = res;
    });

    expect(result).toEqual(mockDraftRes);
    expect(mockHttp.post).toHaveBeenCalledTimes(1);

    const callArgs = mockHttp.post.mock.calls[0];
    expect(callArgs[0]).toBe(`${baseUrl}/bookings/drafts/501/confirm`);
    expect(callArgs[1]).toEqual({});
    const headers = callArgs[2].headers as HttpHeaders;
    expect(headers.get('Idempotency-Key')).toBe(testKey);
  });

  it('confirmBookingDraft should work without Idempotency-Key header when omitted', () => {
    mockHttp.post.mockReturnValue(of({ id: 501, status: 'CONFIRMED' }));

    service.confirmBookingDraft(501).subscribe();

    expect(mockHttp.post).toHaveBeenCalledTimes(1);
    const callArgs = mockHttp.post.mock.calls[0];
    const headers = callArgs[2].headers as HttpHeaders;
    expect(headers.has('Idempotency-Key')).toBe(false);
  });
});

