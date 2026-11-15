import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Router, NavigationStart } from '@angular/router';
import { AiChatWidgetComponent } from './ai-chat-widget.component';
import { AiChatService } from '../../../core/services/ai-chat.service';
import { AiService } from '../../../core/services/ai.service';
import { AuthService } from '../../../core/services/auth.service';
import { RoomService } from '../../../core/services/room.service';
import { BusSeatService } from '../../../core/services/bus-seat.service';
import { BusBookingService } from '../../../core/services/bus-booking.service';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusRouteService } from '../../../core/services/bus-route.service';
import { BusTripService } from '../../../core/services/bus-trip.service';
import { HotelBusStopService } from '../../../core/services/hotel-bus-stop.service';
import { BookingStateService } from '../../../core/services/booking-state.service';
import { SpeechInputService } from '../../../core/services/speech-input.service';
import { SpeechLanguage } from '../../../core/models/speech-recognition.model';
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
  let mockBusStopService: any;
  let mockBusRouteService: any;
  let mockBusTripService: any;
  let mockHotelBusStopService: any;
  let mockBookingStateService: any;
  let mockSpeechInputService: any;

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
      events: of(new NavigationStart(1, '/hotels/2')),
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
    mockBusStopService = {
      getAllBusStops: vi.fn().mockImplementation((params) => {
        const all = [
          { id: 1, name: 'Tahrir Square', city: 'Cairo' },
          { id: 2, name: 'Sidi Gaber', city: 'Alexandria' },
        ];
        if (params?.city) {
          return of({ content: all.filter((s) => s.city.toLowerCase() === params.city.toLowerCase()) });
        }
        return of({ content: all });
      }),
      getBusStopById: vi.fn().mockReturnValue(of({ id: 2, name: 'Sidi Gaber', city: 'Alexandria' })),
    };
    mockBusRouteService = {
      getAllBusRoutes: vi.fn().mockReturnValue(of({
        content: [
          { id: 10, name: 'Cairo - Alexandria', originStopId: 1, destinationStopId: 2 }
        ]
      })),
    };
    mockBusTripService = {
      getAllBusTrips: vi.fn().mockReturnValue(of({ content: [] })),
    };
    mockHotelBusStopService = {
      getHotelBusStopsByHotelId: vi.fn().mockReturnValue(of([])),
    };
    mockBookingStateService = {
      selectOutgoingTrip: vi.fn(),
      selectReturnTrip: vi.fn(),
      hasHotel: vi.fn().mockReturnValue(false),
      hotelBooking: vi.fn().mockReturnValue(null),
    };

    const isListeningSig = signal(false);
    const interimSig = signal('');
    const finalSig = signal('');
    const errorSig = signal<string | null>(null);
    const currentLangSig = signal<SpeechLanguage>('en-US');
    const isSupportedSig = signal(true);

    mockSpeechInputService = {
      isListening: isListeningSig,
      interimText: interimSig,
      finalText: finalSig,
      error: errorSig,
      currentLanguage: currentLangSig,
      isSupported: isSupportedSig,
      start: vi.fn().mockImplementation((lang, cb) => {
        isListeningSig.set(true);
        currentLangSig.set(lang || 'en-US');
        mockSpeechInputService._cb = cb;
      }),
      stop: vi.fn().mockImplementation(() => {
        isListeningSig.set(false);
      }),
      dispose: vi.fn().mockImplementation(() => {
        isListeningSig.set(false);
      }),
      checkSupport: vi.fn().mockReturnValue(true),
      mapErrorCodeToMessage: vi.fn().mockReturnValue('Mock error'),
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
        { provide: BusStopService, useValue: mockBusStopService },
        { provide: BusRouteService, useValue: mockBusRouteService },
        { provide: BusTripService, useValue: mockBusTripService },
        { provide: HotelBusStopService, useValue: mockHotelBusStopService },
        { provide: BookingStateService, useValue: mockBookingStateService },
        { provide: SpeechInputService, useValue: mockSpeechInputService },
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

  describe('Part 3: AI Room Selection Title & Capacity Filtering/Sorting', () => {
    it('getRoomSelectionTitle should format title with adults and children accurately', () => {
      expect(component.getRoomSelectionTitle(2, [])).toBe('Select a room for 2 adult(s):');
      expect(component.getRoomSelectionTitle(1, [14])).toBe('Select a room for 1 adult(s) and 1 child(ren):');
      expect(component.getRoomSelectionTitle(3, [5, 15])).toBe('Select a room for 3 adult(s) and 2 child(ren):');
    });

    it('loadHotelRooms should filter out rooms where capacity < requiredCapacity and sort capacity ASC, price ASC', async () => {
      const mockRooms = [
        { id: 1, roomNumber: '101', capacity: 2, pricePerNight: 1000 },
        { id: 2, roomNumber: '102', capacity: 4, pricePerNight: 2500 },
        { id: 3, roomNumber: '103', capacity: 3, pricePerNight: 1800 },
        { id: 4, roomNumber: '104', capacity: 3, pricePerNight: 1500 },
        { id: 5, roomNumber: '105', capacity: 1, pricePerNight: 800 },
      ];
      mockRoomService.getRoomsByHotelId.mockReturnValue(of(mockRooms));

      // 2 adults + 1 child aged 14 -> requiredCapacity = 3 (child aged 14 is chargeable)
      component.hotelBookingState.set({
        step: 'dates',
        hotel: { id: 1, name: 'Test Hotel', city: 'Cairo' },
        checkIn: '2026-12-01',
        checkOut: '2026-12-05',
        adults: 2,
        childCount: 1,
        childAges: [14],
        originCity: null,
        availableRooms: [],
        selectedRoom: null,
        draft: null,
        confirmedBooking: null,
        loading: false,
        error: null,
      });

      await component.loadHotelRooms();

      const state = component.hotelBookingState();
      expect(state?.step).toBe('rooms');
      // Rooms with capacity < 3 (rooms 101 and 105) must be excluded
      expect(state?.availableRooms.map((r) => r.id)).toEqual([4, 3, 2]); // capacity 3 (1500), capacity 3 (1800), capacity 4 (2500)
      expect(state?.selectedRoom?.id).toBe(4);
      expect(state?.error).toBeNull();
    });

    it('loadHotelRooms should treat children aged 0-11 as free and not count them toward required capacity', async () => {
      const mockRooms = [
        { id: 1, roomNumber: '101', capacity: 2, pricePerNight: 1200 },
        { id: 2, roomNumber: '102', capacity: 2, pricePerNight: 1000 },
      ];
      mockRoomService.getRoomsByHotelId.mockReturnValue(of(mockRooms));

      // 2 adults + 1 child aged 6 -> requiredCapacity = 2 (child is free)
      component.hotelBookingState.set({
        step: 'dates',
        hotel: { id: 1, name: 'Test Hotel', city: 'Cairo' },
        checkIn: '2026-12-01',
        checkOut: '2026-12-05',
        adults: 2,
        childCount: 1,
        childAges: [6],
        originCity: null,
        availableRooms: [],
        selectedRoom: null,
        draft: null,
        confirmedBooking: null,
        loading: false,
        error: null,
      });

      await component.loadHotelRooms();

      const state = component.hotelBookingState();
      expect(state?.availableRooms.length).toBe(2);
      expect(state?.availableRooms.map((r) => r.id)).toEqual([2, 1]); // sorted by price ASC: 1000, 1200
    });

    it('loadHotelRooms should show error when no rooms meet required capacity', async () => {
      const mockRooms = [
        { id: 1, roomNumber: '101', capacity: 2, pricePerNight: 1000 },
      ];
      mockRoomService.getRoomsByHotelId.mockReturnValue(of(mockRooms));

      // 3 adults + 1 child aged 15 -> requiredCapacity = 4
      component.hotelBookingState.set({
        step: 'dates',
        hotel: { id: 1, name: 'Test Hotel', city: 'Cairo' },
        checkIn: '2026-12-01',
        checkOut: '2026-12-05',
        adults: 3,
        childCount: 1,
        childAges: [15],
        originCity: null,
        availableRooms: [],
        selectedRoom: null,
        draft: null,
        confirmedBooking: null,
        loading: false,
        error: null,
      });

      await component.loadHotelRooms();

      const state = component.hotelBookingState();
      expect(state?.availableRooms.length).toBe(0);
      expect(state?.error).toContain('requires capacity of 4');
    });
  });

  describe('Part 4: AI Bus Suggestions for Chosen Hotel', () => {
    it('loadOriginCities should extract unique sorted cities from bus stops', async () => {
      await component.loadOriginCities();
      expect(component.availableOriginCities()).toEqual(['Alexandria', 'Cairo']);
    });

    it('chooseOriginCity should query eligible bus trips and post assistant message with BUS_TRIP results', async () => {
      const mockTrip = {
        id: 301,
        routeId: 10,
        busId: 5,
        departureTime: '2026-12-01T09:00:00',
        arrivalTime: '2026-12-01T12:00:00',
        price: 250,
        status: 'SCHEDULED',
      };
      mockBusTripService.getAllBusTrips.mockReturnValue(of({ content: [mockTrip] }));
      mockRoomService.getRoomsByHotelId.mockReturnValue(of([
        { id: 101, roomNumber: '101', capacity: 2, pricePerNight: 1000 }
      ]));

      component.hotelBookingState.set({
        step: 'origin',
        hotel: { id: 1, name: 'Cecil Alexandria', city: 'Alexandria' },
        checkIn: '2026-12-01',
        checkOut: '2026-12-05',
        adults: 2,
        childCount: 0,
        childAges: [],
        originCity: null,
        availableRooms: [],
        selectedRoom: null,
        draft: null,
        confirmedBooking: null,
        loading: false,
        error: null,
      });

      await component.chooseOriginCity('Cairo');

      const messages = mockAiChatService._messagesSignal.list;
      const busMsg = messages.find((m: any) => m.results?.some((r: any) => r.type === 'BUS_TRIP'));
      expect(busMsg).toBeDefined();
      expect(busMsg.results[0].data[0].id).toBe(301);
      expect(component.hotelBookingState()?.step).toBe('rooms');
    });

    it('chooseOriginCity should post message explaining routes have no intermediate stops when no route/trips match', async () => {
      mockBusTripService.getAllBusTrips.mockReturnValue(of({ content: [] }));
      mockRoomService.getRoomsByHotelId.mockReturnValue(of([
        { id: 101, roomNumber: '101', capacity: 2, pricePerNight: 1000 }
      ]));

      component.hotelBookingState.set({
        step: 'origin',
        hotel: { id: 1, name: 'Cecil Alexandria', city: 'Alexandria' },
        checkIn: '2026-12-01',
        checkOut: '2026-12-05',
        adults: 2,
        childCount: 0,
        childAges: [],
        originCity: null,
        availableRooms: [],
        selectedRoom: null,
        draft: null,
        confirmedBooking: null,
        loading: false,
        error: null,
      });

      await component.chooseOriginCity('Cairo');

      const messages = mockAiChatService._messagesSignal.list;
      const emptyMsg = messages.find((m: any) => m.text?.includes('Routes in our system have no intermediate stops'));
      expect(emptyMsg).toBeDefined();
      expect(component.hotelBookingState()?.step).toBe('rooms');
    });

    it('selectBusTripForSummary should open seat selection dialog without creating booking directly', () => {
      const trip = {
        id: 777,
        routeId: 10,
        busId: 2,
        departureTime: '2026-12-01T10:00:00',
        arrivalTime: '2026-12-01T13:00:00',
        price: 280,
        originCity: 'Cairo',
        destinationCity: 'Alexandria',
      };

      component.selectBusTripForSummary(trip);

      expect(component.seatDialogVisible()).toBe(true);
      expect(component.selectedTripForSeats()?.id).toBe(777);
      expect(mockBusBookingService.createBusBooking).not.toHaveBeenCalled();
    });
  });

  describe('Voice Input (Speech-to-Text) Flow', () => {
    it('toggleSpeechInput should start speech recognition when not listening', () => {
      expect(mockSpeechInputService.isListening()).toBe(false);
      component.currentInput.set('Hello');

      component.toggleSpeechInput();

      expect(mockSpeechInputService.start).toHaveBeenCalledWith('en-US', expect.any(Function));
      expect(mockSpeechInputService.isListening()).toBe(true);
    });

    it('should append speech transcript to existing input text without auto-sending', () => {
      component.currentInput.set('Please show me');
      component.toggleSpeechInput();

      expect(mockSpeechInputService._cb).toBeDefined();
      // Simulate interim speech transcript
      mockSpeechInputService._cb({ interim: 'cheap rooms', final: '' });
      expect(component.currentInput()).toBe('Please show me cheap rooms');

      // Simulate final transcript replacing interim
      mockSpeechInputService._cb({ interim: '', final: 'cheap rooms in Alexandria' });
      expect(component.currentInput()).toBe('Please show me cheap rooms in Alexandria');

      // Crucial: Speech transcript must NOT auto-send
      expect(mockAiChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('toggleSpeechInput should stop listening when already listening', () => {
      mockSpeechInputService.isListening.set(true);

      component.toggleSpeechInput();

      expect(mockSpeechInputService.stop).toHaveBeenCalled();
    });

    it('toggleSpeechLanguage should toggle language and stop active listening session', () => {
      expect(component.selectedSpeechLang()).toBe('en-US');

      mockSpeechInputService.isListening.set(true);
      component.toggleSpeechLanguage();

      expect(component.selectedSpeechLang()).toBe('ar-EG');
      expect(mockSpeechInputService.stop).toHaveBeenCalled();

      // Toggle back to en-US
      component.toggleSpeechLanguage();
      expect(component.selectedSpeechLang()).toBe('en-US');
    });

    it('close should stop listening when widget is closed', () => {
      mockSpeechInputService.isListening.set(true);

      component.close();

      expect(component.isOpen()).toBe(false);
      expect(mockSpeechInputService.stop).toHaveBeenCalled();
    });

    it('send should stop listening when message is sent', () => {
      component.currentInput.set('Find hotels');
      mockSpeechInputService.isListening.set(true);
      mockAiChatService.sendMessage.mockReturnValue(of({}));

      component.send();

      expect(mockSpeechInputService.stop).toHaveBeenCalled();
      expect(mockAiChatService.sendMessage).toHaveBeenCalledWith('Find hotels');
    });

    it('clearHistory should stop speech recognition and clear errors', () => {
      mockSpeechInputService.isListening.set(true);
      mockSpeechInputService.error.set('Some error');

      component.clearHistory();

      expect(mockSpeechInputService.stop).toHaveBeenCalled();
      expect(mockSpeechInputService.error()).toBeNull();
      expect(mockAiChatService.clearConversation).toHaveBeenCalled();
    });

    it('ngOnDestroy should dispose speech recognition resources', () => {
      component.ngOnDestroy();

      expect(mockSpeechInputService.dispose).toHaveBeenCalled();
    });
  });
});
