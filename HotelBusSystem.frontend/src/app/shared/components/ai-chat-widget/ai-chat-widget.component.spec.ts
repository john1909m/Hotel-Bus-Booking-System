import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AiChatWidgetComponent } from './ai-chat-widget.component';
import { AiChatService } from '../../../core/services/ai-chat.service';
import { AiService } from '../../../core/services/ai.service';
import { AuthService } from '../../../core/services/auth.service';
import { RoomService } from '../../../core/services/room.service';
import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { BookingDraftResponse } from '../../../core/models/AI Assistant/BookingDraft.model';

describe('AiChatWidgetComponent', () => {
  let component: AiChatWidgetComponent;
  let mockRouter: any;
  let mockAuthService: any;
  let mockAiService: any;
  let mockAiChatService: any;
  let mockRoomService: any;
  let mockBusSeatService: any;
  let mockBusBookingService: any;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }

    mockRouter = {
      navigate: vi.fn(),
      url: '/hotels/1',
    };

    mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      currentUser: vi.fn().mockReturnValue({ id: 99, email: 'user@test.com' }),
    };

    mockAiService = {
      chat: vi.fn(),
      getConversation: vi.fn(),
      createBookingDraft: vi.fn(),
      getBookingDraft: vi.fn(),
      confirmBookingDraft: vi.fn(),
    };

    const messagesSignal = {
      list: [] as any[],
      update(fn: (curr: any[]) => any[]) {
        this.list = fn(this.list);
      },
      set(val: any[]) {
        this.list = val;
      },
    };

    mockAiChatService = {
      messages: vi.fn().mockImplementation(() => messagesSignal.list),
      isMockMode: vi.fn().mockReturnValue(false),
      isLoading: vi.fn().mockReturnValue(false),
      lastError: vi.fn().mockReturnValue(null),
      lastErrorCode: vi.fn().mockReturnValue(null),
      failedMessage: vi.fn().mockReturnValue(null),
      loadConversationHistory: vi.fn().mockReturnValue(of([])),
      clearConversation: vi.fn(),
      toggleMockMode: vi.fn(),
      sendMessage: vi.fn(),
      retryLastMessage: vi.fn(),
      _messagesSignal: messagesSignal,
    };
    // Bind mock messages update
    mockAiChatService.messages.update = messagesSignal.update.bind(messagesSignal);
    mockAiChatService.messages.set = messagesSignal.set.bind(messagesSignal);

    mockRoomService = {
      getRoomsByHotelId: vi.fn().mockReturnValue(of([])),
    };
    mockBusSeatService = {
      getBusSeatsByBusId: vi.fn().mockReturnValue(of([])),
    };
    mockBusBookingService = {
      getBusBookingsByBusTripId: vi.fn().mockReturnValue(of({ content: [] })),
      createBusBooking: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AiService, useValue: mockAiService },
        { provide: AiChatService, useValue: mockAiChatService },
        { provide: RoomService, useValue: mockRoomService },
        { provide: BusSeatService, useValue: mockBusSeatService },
        { provide: BusBookingService, useValue: mockBusBookingService },
        AiChatWidgetComponent,
      ],
    });

    component = runInInjectionContext(injector, () => new AiChatWidgetComponent());
  });

  it('should initialize closed with empty booking state', () => {
    expect(component.isOpen()).toBe(false);
    expect(component.hotelBookingState()).toBeNull();
    expect(component.busBookingState()).toBeNull();
  });

  describe('AI Booking Confirmation Flow', () => {
    it('guest user clicking confirmDraft should redirect to login and NOT call backend confirm', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);

      const draft: BookingDraftResponse = {
        id: 101,
        status: 'CREATED',
        expiresAt: '2026-12-01T12:00:00',
        hotelName: 'Grand Nile Tower',
        totalPrice: 2000,
      };

      await component.confirmDraft(draft);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/hotels/1' },
      });
      expect(mockAiService.confirmBookingDraft).not.toHaveBeenCalled();
      expect(draft.status).toBe('CREATED');
    });

    it('authenticated user clicking confirmDraft should send idempotency key and update status to CONFIRMED with PENDING notice', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const draft: BookingDraftResponse = {
        id: 202,
        status: 'CREATED',
        expiresAt: '2026-12-01T12:00:00',
        hotelName: 'Grand Nile Tower',
        totalPrice: 3500,
      };

      const mockConfirmedResponse: BookingDraftResponse = {
        id: 202,
        status: 'CONFIRMED',
        expiresAt: '2026-12-01T12:00:00',
        hotelName: 'Grand Nile Tower',
        totalPrice: 3500,
        bookingId: 777,
        busBookingIds: [881],
      };

      mockAiService.confirmBookingDraft.mockReturnValue(of(mockConfirmedResponse));

      await component.confirmDraft(draft);

      expect(mockAiService.confirmBookingDraft).toHaveBeenCalledTimes(1);
      const callDraftId = mockAiService.confirmBookingDraft.mock.calls[0][0];
      const callKey = mockAiService.confirmBookingDraft.mock.calls[0][1];

      expect(callDraftId).toBe(202);
      expect(typeof callKey).toBe('string');
      expect(callKey.length).toBeGreaterThan(10);

      expect(draft.status).toBe('CONFIRMED');
      expect(draft.bookingId).toBe(777);
      expect(draft.busBookingIds).toEqual([881]);

      // Verify the chat message does NOT say payment is completed and confirms PENDING review
      const messages = mockAiChatService._messagesSignal.list;
      expect(messages.length).toBeGreaterThan(0);
      const lastMsg = messages[messages.length - 1];
      expect(lastMsg.text).toContain('#777');
      expect(lastMsg.text).toContain('PENDING');
      expect(lastMsg.text.toLowerCase()).not.toContain('payment completed');
      expect(lastMsg.text.toLowerCase()).not.toContain('paid');
    });

    it('on failure, confirmDraft should display error message and leave draft available for retry with SAME idempotency key', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const draft: BookingDraftResponse = {
        id: 303,
        status: 'CREATED',
        expiresAt: '2026-12-01T12:00:00',
        hotelName: 'Rixos Sharm',
        totalPrice: 5000,
      };

      // First attempt fails with 400
      mockAiService.confirmBookingDraft.mockReturnValueOnce(
        throwError(() => ({
          status: 400,
          error: { message: 'Selected room is fully booked' },
        }))
      );

      await component.confirmDraft(draft);

      expect(draft.status).toBe('CREATED');
      expect(component.getDraftError(303)).toContain('Selected room is fully booked');

      const firstKey = mockAiService.confirmBookingDraft.mock.calls[0][1];

      // Second attempt (retry) succeeds
      const mockSuccess: BookingDraftResponse = {
        id: 303,
        status: 'CONFIRMED',
        expiresAt: '2026-12-01T12:00:00',
        bookingId: 999,
      };
      mockAiService.confirmBookingDraft.mockReturnValueOnce(of(mockSuccess));

      await component.confirmDraft(draft);

      expect(mockAiService.confirmBookingDraft).toHaveBeenCalledTimes(2);
      const secondKey = mockAiService.confirmBookingDraft.mock.calls[1][1];

      // Idempotency key MUST be reused on retry
      expect(secondKey).toBe(firstKey);
      expect(draft.status).toBe('CONFIRMED');
      expect(draft.bookingId).toBe(999);
    });

    it('cancelDraft should update status to CANCELLED and append cancellation message', () => {
      const draft: BookingDraftResponse = {
        id: 404,
        status: 'CREATED',
        expiresAt: '2026-12-01T12:00:00',
        hotelName: 'Steigenberger Cecil',
        totalPrice: 1800,
      };

      component.cancelDraft(draft);

      expect(draft.status).toBe('CANCELLED');
      const messages = mockAiChatService._messagesSignal.list;
      const cancelMsg = messages.find((m: any) => m.text.includes('#404'));
      expect(cancelMsg).toBeDefined();
      expect(cancelMsg.text).toContain('cancelled');
    });

    it('createHotelBookingDraft should append a draft card message to chat and close wizard', async () => {
      component.hotelBookingState.set({
        step: 'rooms',
        hotel: { id: 1, name: 'Grand Nile Tower', city: 'Cairo' },
        checkIn: '2026-12-01',
        checkOut: '2026-12-04',
        adults: 2,
        childCount: 0,
        childAges: [],
        availableRooms: [],
        selectedRoom: { id: 101, roomNumber: '101', capacity: 2, pricePerNight: 1200 } as any,
        draft: null,
        confirmedBooking: null,
        loading: false,
        error: null,
      });

      const mockCreatedDraft: BookingDraftResponse = {
        id: 555,
        status: 'CREATED',
        expiresAt: '2026-12-01T12:30:00',
        hotelId: 1,
        hotelName: 'Grand Nile Tower',
        roomId: 101,
        checkInDate: '2026-12-01',
        checkOutDate: '2026-12-04',
        nights: 3,
        totalPrice: 3600,
      };

      mockAiService.createBookingDraft.mockReturnValue(of(mockCreatedDraft));

      await component.createHotelBookingDraft();

      expect(component.hotelBookingState()).toBeNull();
      const messages = mockAiChatService._messagesSignal.list;
      const draftMsg = messages.find((m: any) => m.draftId === 555);
      expect(draftMsg).toBeDefined();
      expect(draftMsg.draft).toEqual(mockCreatedDraft);
    });
  });
});
