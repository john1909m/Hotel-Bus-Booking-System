package com.spring.boot.service.impl;

import com.spring.boot.dto.BusTripPriceBreakdownDto;
import com.spring.boot.dto.ai.BookingDraftRequest;
import com.spring.boot.dto.ai.BookingDraftResponse;
import com.spring.boot.enums.*;
import com.spring.boot.exception.InvalidGuestCountException;
import com.spring.boot.exception.InvalidSeatException;
import com.spring.boot.exception.RoomUnavailableException;
import com.spring.boot.exception.SeatAlreadyBookedException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.*;
import com.spring.boot.repository.*;
import com.spring.boot.service.ai.AiToolsImpl;
import com.spring.boot.service.interfaces.BusBookingService;
import com.spring.boot.service.interfaces.HotelBookingService;
import com.spring.boot.service.interfaces.PaymentService;
import com.spring.boot.service.interfaces.PricingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class BookingDraftServiceImplTest {

    @Mock
    private BookingDraftRepository bookingDraftRepository;
    @Mock
    private HotelRepository hotelRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private BusTripRepository busTripRepository;
    @Mock
    private BusSeatRepository busSeatRepository;
    @Mock
    private BusBookingRepository busBookingRepository;
    @Mock
    private HotelBookingRepository hotelBookingRepository;
    @Mock
    private HotelBookingRoomRepository hotelBookingRoomRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private HotelBookingService hotelBookingService;
    @Mock
    private BusBookingService busBookingService;
    @Mock
    private PaymentService paymentService;
    @Mock
    private PricingService pricingService;
    @Mock
    private BundleMessageService bundleMessageService;

    @InjectMocks
    private BookingDraftServiceImpl bookingDraftService;

    private Hotel testHotel;
    private Room room1;
    private Room room2;
    private Bus testBus;
    private BusTrip testTrip;
    private BusSeat seatA;
    private BusSeat seatB;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(bookingDraftService, "draftTtlMinutes", 30L);

        lenient().when(bundleMessageService.getMessage(anyString())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(bundleMessageService.getMessage(anyString(), any(Object[].class))).thenAnswer(invocation -> invocation.getArgument(0));

        testHotel = new Hotel();
        testHotel.setId(1L);
        testHotel.setName("Grand Hotel");

        room1 = new Room();
        room1.setId(10L);
        room1.setRoomNumber("101");
        room1.setCapacity(2);
        room1.setPricePerNight(100.0);
        room1.setHotel(testHotel);
        room1.setRoomType(RoomType.DOUBLE);

        room2 = new Room();
        room2.setId(20L);
        room2.setRoomNumber("102");
        room2.setCapacity(2);
        room2.setPricePerNight(150.0);
        room2.setHotel(testHotel);
        room2.setRoomType(RoomType.DOUBLE);

        testBus = new Bus();
        testBus.setId(1L);

        testTrip = new BusTrip();
        testTrip.setId(100L);
        testTrip.setBus(testBus);
        testTrip.setStatus(BusTripStatus.SCHEDULED);
        testTrip.setDepartureTime(LocalDateTime.now().plusDays(2));

        seatA = new BusSeat();
        seatA.setId(501L);
        seatA.setSeatNumber("1A");
        seatA.setBus(testBus);
        seatA.setSeatType(SeatType.REGULAR);

        seatB = new BusSeat();
        seatB.setId(502L);
        seatB.setSeatNumber("1B");
        seatB.setBus(testBus);
        seatB.setSeatType(SeatType.REGULAR);
    }

    // 1. Draft with 2 rooms of same hotel, enough capacity: created, price = sum of both rooms x nights
    @Test
    void testCreateDraft_TwoRoomsSameHotel_Success() {
        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOut = LocalDate.now().plusDays(7); // 2 nights
        long nights = 2;

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(testHotel));
        when(roomRepository.findAllById(List.of(10L, 20L))).thenReturn(List.of(room1, room2));
        when(hotelBookingService.isRoomAvailable(1L, checkIn, checkOut, 10L)).thenReturn(true);
        when(hotelBookingService.isRoomAvailable(1L, checkIn, checkOut, 20L)).thenReturn(true);
        when(hotelBookingService.calculateRequiredCapacity(any(), any(), any())).thenReturn(4);
        when(bookingDraftRepository.save(any(BookingDraft.class))).thenAnswer(i -> {
            BookingDraft d = i.getArgument(0);
            d.setId(99L);
            return d;
        });

        BookingDraftRequest request = new BookingDraftRequest(
                1L,
                null,
                List.of(10L, 20L),
                checkIn,
                checkOut,
                4,
                4,
                List.of(),
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        BookingDraftResponse response = bookingDraftService.createDraft(1L, request);

        assertNotNull(response);
        assertEquals(2, response.getRoomIds().size());
        assertEquals(2, response.getRooms().size());
        // Price: (100 * 2) + (150 * 2) = 200 + 300 = 500
        BigDecimal expectedPrice = BigDecimal.valueOf(100.0 * nights + 150.0 * nights);
        assertEquals(0, expectedPrice.compareTo(response.getHotelTotal()));
        assertEquals(0, expectedPrice.compareTo(response.getTotalPrice()));
    }

    // Draft with rooms from two hotels: throws 400 (room_not_in_hotel)
    @Test
    void testCreateDraft_RoomsFromDifferentHotels_Throws400() {
        Hotel otherHotel = new Hotel();
        otherHotel.setId(2L);
        Room roomOtherHotel = new Room();
        roomOtherHotel.setId(30L);
        roomOtherHotel.setHotel(otherHotel);

        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOut = LocalDate.now().plusDays(7);

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(testHotel));
        when(roomRepository.findAllById(List.of(10L, 30L))).thenReturn(List.of(room1, roomOtherHotel));

        BookingDraftRequest request = new BookingDraftRequest(
                1L,
                null,
                List.of(10L, 30L),
                checkIn,
                checkOut,
                2,
                2,
                List.of(),
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertThrows(IllegalArgumentException.class, () -> bookingDraftService.createDraft(1L, request));
    }

    // 2. Draft with 4 guests and a single room of capacity 2: 400 capacity_exceeded
    @Test
    void testCreateDraft_CapacityExceeded_Throws400() {
        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOut = LocalDate.now().plusDays(7);

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(testHotel));
        when(roomRepository.findAllById(List.of(10L))).thenReturn(List.of(room1)); // capacity 2
        when(hotelBookingService.isRoomAvailable(1L, checkIn, checkOut, 10L)).thenReturn(true);
        when(hotelBookingService.calculateRequiredCapacity(any(), any(), any())).thenReturn(4); // required 4

        BookingDraftRequest request = new BookingDraftRequest(
                1L,
                10L,
                List.of(10L),
                checkIn,
                checkOut,
                4,
                4,
                List.of(),
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertThrows(InvalidGuestCountException.class, () -> bookingDraftService.createDraft(1L, request));
    }

    // 3. Draft with going seats [A, B] on a bus with A and B free: created, seat count 2 equals transport passengers 2
    @Test
    void testCreateDraft_MultiSeat_Success() {
        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOut = LocalDate.now().plusDays(7);

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(testHotel));
        when(roomRepository.findAllById(List.of(10L))).thenReturn(List.of(room1));
        when(hotelBookingService.isRoomAvailable(1L, checkIn, checkOut, 10L)).thenReturn(true);
        when(hotelBookingService.calculateRequiredCapacity(any(), any(), any())).thenReturn(2);

        when(busTripRepository.findById(100L)).thenReturn(Optional.of(testTrip));
        when(busSeatRepository.findById(501L)).thenReturn(Optional.of(seatA));
        when(busSeatRepository.findById(502L)).thenReturn(Optional.of(seatB));
        when(busBookingService.isSeatAvailable(100L, 501L)).thenReturn(true);
        when(busBookingService.isSeatAvailable(100L, 502L)).thenReturn(true);

        BusTripPriceBreakdownDto breakdown = BusTripPriceBreakdownDto.builder()
                .total(BigDecimal.valueOf(250.0))
                .build();
        when(pricingService.calculateBusTripPrice(testTrip)).thenReturn(breakdown);

        when(bookingDraftRepository.save(any(BookingDraft.class))).thenAnswer(i -> {
            BookingDraft d = i.getArgument(0);
            d.setId(99L);
            return d;
        });

        BookingDraftRequest request = new BookingDraftRequest(
                1L,
                10L,
                List.of(10L),
                checkIn,
                checkOut,
                2,
                2,
                List.of(),
                100L,
                null,
                List.of(501L, 502L),
                null,
                null,
                null,
                2 // transport passengers
        );

        BookingDraftResponse response = bookingDraftService.createDraft(1L, request);

        assertNotNull(response);
        assertEquals(2, response.getGoingSeatIds().size());
        assertEquals(0, BigDecimal.valueOf(500.0).compareTo(response.getGoingTransportPrice()));
    }

    // 4. Seat count mismatch (2 passengers, 3 seats): 400 seat_count_mismatch
    @Test
    void testCreateDraft_SeatCountMismatch_Throws400() {
        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOut = LocalDate.now().plusDays(7);

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(testHotel));
        when(roomRepository.findAllById(List.of(10L))).thenReturn(List.of(room1));
        when(hotelBookingService.isRoomAvailable(1L, checkIn, checkOut, 10L)).thenReturn(true);
        when(hotelBookingService.calculateRequiredCapacity(any(), any(), any())).thenReturn(2);
        when(busTripRepository.findById(100L)).thenReturn(Optional.of(testTrip));

        BookingDraftRequest request = new BookingDraftRequest(
                1L,
                10L,
                List.of(10L),
                checkIn,
                checkOut,
                2,
                2,
                List.of(),
                100L,
                null,
                List.of(501L, 502L, 503L), // 3 seats for 2 passengers
                null,
                null,
                null,
                2
        );

        assertThrows(InvalidSeatException.class, () -> bookingDraftService.createDraft(1L, request));
    }

    // 5. Seat taken by another user between draft and confirm: confirm returns 409 seat_unavailable and creates nothing
    @Test
    void testConfirm_SeatTakenBeforeConfirm_Throws409() {
        BookingDraft draft = BookingDraft.builder()
                .id(99L)
                .userId(1L)
                .hotelId(1L)
                .checkIn(LocalDate.now().plusDays(5))
                .checkOut(LocalDate.now().plusDays(7))
                .guests(2)
                .adults(2)
                .transportPassengers(2)
                .rooms(List.of(DraftRoomSnapshot.builder().roomId(10L).capacity(2).pricePerNight(BigDecimal.valueOf(100)).build()))
                .outgoingTripId(100L)
                .goingSeats(List.of(
                        DraftSeatSnapshot.builder().seatId(501L).build(),
                        DraftSeatSnapshot.builder().seatId(502L).build()
                ))
                .status(DraftStatus.CREATED)
                .source(DraftSource.USER_SELECTED)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .totalPrice(BigDecimal.valueOf(450))
                .build();

        when(bookingDraftRepository.findByIdAndUserIdForUpdate(99L, 1L)).thenReturn(Optional.of(draft));
        when(roomRepository.findAllByIdsForUpdate(List.of(10L))).thenReturn(List.of(room1));
        when(hotelBookingService.isRoomAvailable(eq(1L), any(), any(), eq(10L))).thenReturn(true);
        when(busTripRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testTrip));
        when(busSeatRepository.findById(501L)).thenReturn(Optional.of(seatA));
        // Seat 501 is taken by another user!
        when(busBookingService.isSeatAvailable(100L, 501L)).thenReturn(false);

        assertThrows(SeatAlreadyBookedException.class, () -> bookingDraftService.confirm(1L, 99L, "idem-123"));

        // Verify nothing was saved as booking
        verify(hotelBookingRepository, never()).save(any());
        verify(busBookingRepository, never()).save(any());
    }

    // 6. Two rooms, one becomes unavailable before confirm: 409 room_unavailable, nothing saved
    @Test
    void testConfirm_RoomUnavailableBeforeConfirm_Throws409() {
        BookingDraft draft = BookingDraft.builder()
                .id(99L)
                .userId(1L)
                .hotelId(1L)
                .checkIn(LocalDate.now().plusDays(5))
                .checkOut(LocalDate.now().plusDays(7))
                .guests(4)
                .adults(4)
                .rooms(List.of(
                        DraftRoomSnapshot.builder().roomId(10L).capacity(2).pricePerNight(BigDecimal.valueOf(100)).build(),
                        DraftRoomSnapshot.builder().roomId(20L).capacity(2).pricePerNight(BigDecimal.valueOf(150)).build()
                ))
                .status(DraftStatus.CREATED)
                .source(DraftSource.USER_SELECTED)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .totalPrice(BigDecimal.valueOf(500))
                .build();

        when(bookingDraftRepository.findByIdAndUserIdForUpdate(99L, 1L)).thenReturn(Optional.of(draft));
        when(roomRepository.findAllByIdsForUpdate(List.of(10L, 20L))).thenReturn(List.of(room1, room2));
        when(hotelBookingService.isRoomAvailable(1L, draft.getCheckIn(), draft.getCheckOut(), 10L)).thenReturn(true);
        // Room 20 became unavailable!
        when(hotelBookingService.isRoomAvailable(1L, draft.getCheckIn(), draft.getCheckOut(), 20L)).thenReturn(false);

        assertThrows(RoomUnavailableException.class, () -> bookingDraftService.confirm(1L, 99L, "idem-123"));

        verify(hotelBookingRepository, never()).save(any());
        verify(hotelBookingRoomRepository, never()).save(any());
    }

    // 7. Confirm creates one hotel booking with two room rows and one bus booking per seat, all in one transaction
    @Test
    void testConfirm_Success_CreatesHotelBookingAndBusBookings() {
        BookingDraft draft = BookingDraft.builder()
                .id(99L)
                .userId(1L)
                .hotelId(1L)
                .checkIn(LocalDate.now().plusDays(5))
                .checkOut(LocalDate.now().plusDays(7))
                .guests(2)
                .adults(2)
                .transportPassengers(2)
                .rooms(List.of(
                        DraftRoomSnapshot.builder().roomId(10L).roomNumber("101").capacity(2).pricePerNight(BigDecimal.valueOf(100)).build(),
                        DraftRoomSnapshot.builder().roomId(20L).roomNumber("102").capacity(2).pricePerNight(BigDecimal.valueOf(150)).build()
                ))
                .outgoingTripId(100L)
                .goingSeats(List.of(
                        DraftSeatSnapshot.builder().seatId(501L).seatNumber("1A").build(),
                        DraftSeatSnapshot.builder().seatId(502L).seatNumber("1B").build()
                ))
                .hotelTotal(BigDecimal.valueOf(500.0))
                .goingTransportPrice(BigDecimal.valueOf(200.0))
                .totalPrice(BigDecimal.valueOf(700.0))
                .status(DraftStatus.CREATED)
                .source(DraftSource.USER_SELECTED)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();

        when(bookingDraftRepository.findByIdAndUserIdForUpdate(99L, 1L)).thenReturn(Optional.of(draft));
        when(roomRepository.findAllByIdsForUpdate(List.of(10L, 20L))).thenReturn(List.of(room1, room2));
        when(hotelBookingService.isRoomAvailable(1L, draft.getCheckIn(), draft.getCheckOut(), 10L)).thenReturn(true);
        when(hotelBookingService.isRoomAvailable(1L, draft.getCheckIn(), draft.getCheckOut(), 20L)).thenReturn(true);
        when(hotelBookingService.calculateRequiredCapacity(any(), any(), any())).thenReturn(2);

        when(busTripRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testTrip));
        when(busSeatRepository.findById(501L)).thenReturn(Optional.of(seatA));
        when(busSeatRepository.findById(502L)).thenReturn(Optional.of(seatB));
        when(busBookingService.isSeatAvailable(100L, 501L)).thenReturn(true);
        when(busBookingService.isSeatAvailable(100L, 502L)).thenReturn(true);

        BusTripPriceBreakdownDto breakdown = BusTripPriceBreakdownDto.builder()
                .total(BigDecimal.valueOf(100.0))
                .build();
        when(pricingService.calculateBusTripPrice(testTrip)).thenReturn(breakdown);

        User testUser = new User();
        testUser.setId(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        HotelBooking savedHotelBooking = new HotelBooking();
        savedHotelBooking.setId(777L);
        when(hotelBookingRepository.save(any(HotelBooking.class))).thenReturn(savedHotelBooking);

        when(busBookingRepository.save(any(BusBooking.class))).thenAnswer(i -> {
            BusBooking bb = i.getArgument(0);
            bb.setId(new Random().nextLong());
            return bb;
        });

        when(busBookingRepository.findById(anyLong())).thenReturn(Optional.of(new BusBooking()));

        BookingDraftResponse response = bookingDraftService.confirm(1L, 99L, "idem-key");

        assertNotNull(response);
        assertEquals(DraftStatus.CONFIRMED, response.getStatus());

        // Verify: 1 HotelBooking created
        verify(hotelBookingRepository, times(1)).save(any(HotelBooking.class));
        // Verify: 2 HotelBookingRoom rows created
        verify(hotelBookingRoomRepository, times(2)).save(any(HotelBookingRoom.class));
        // Verify: 2 BusBooking rows created (one per seat)
        verify(busBookingRepository, times(2)).save(any(BusBooking.class));
    }

    // 8. AI tools: no tool accepts seatIds or roomIds; calling the AI with "book seat 5" never creates or changes a draft or booking
    @Test
    void testAiTools_NeverAcceptSeatIdsOrRoomIds_AndNeverBook() {
        Method[] methods = AiToolsImpl.class.getDeclaredMethods();
        for (Method method : methods) {
            String name = method.getName().toLowerCase();
            assertFalse(name.startsWith("create") || name.startsWith("reserve") || name.startsWith("confirm") || name.startsWith("book"),
                    "AI tools must not have mutation/booking methods: " + method.getName());
            assertFalse(name.contains("draft"),
                    "AI tools must not have draft methods: " + method.getName());

            for (Parameter param : method.getParameters()) {
                String paramName = param.getName().toLowerCase();
                assertFalse(paramName.equals("seatid") || paramName.equals("seatids"),
                        "AI tool parameter must not be seatId(s): " + method.getName());
                assertFalse(paramName.equals("roomid") || paramName.equals("roomids"),
                        "AI tool parameter must not be roomId(s): " + method.getName());
            }
        }
    }

    // 9. Existing single-room and single-seat drafts still work through the fallback fields
    @Test
    void testSingleRoomAndSingleSeat_BackwardCompatibility() {
        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOut = LocalDate.now().plusDays(7);

        when(hotelRepository.findById(1L)).thenReturn(Optional.of(testHotel));
        when(roomRepository.findAllById(List.of(10L))).thenReturn(List.of(room1));
        when(hotelBookingService.isRoomAvailable(1L, checkIn, checkOut, 10L)).thenReturn(true);
        when(hotelBookingService.calculateRequiredCapacity(any(), any(), any())).thenReturn(1);

        when(busTripRepository.findById(100L)).thenReturn(Optional.of(testTrip));
        when(busSeatRepository.findById(501L)).thenReturn(Optional.of(seatA));
        when(busBookingService.isSeatAvailable(100L, 501L)).thenReturn(true);

        BusTripPriceBreakdownDto breakdown = BusTripPriceBreakdownDto.builder()
                .total(BigDecimal.valueOf(150.0))
                .build();
        when(pricingService.calculateBusTripPrice(testTrip)).thenReturn(breakdown);

        when(bookingDraftRepository.save(any(BookingDraft.class))).thenAnswer(i -> {
            BookingDraft d = i.getArgument(0);
            d.setId(88L);
            return d;
        });

        // Using legacy constructor with single roomId and single seatId
        BookingDraftRequest legacyRequest = new BookingDraftRequest(
                1L,
                10L,
                checkIn,
                checkOut,
                1,
                100L,
                501L,
                null,
                null
        );

        BookingDraftResponse response = bookingDraftService.createDraft(1L, legacyRequest);

        assertNotNull(response);
        assertEquals(10L, response.getRoomId());
        assertEquals(501L, response.getGoingSeatId());
        assertEquals(List.of(10L), response.getRoomIds());
        assertEquals(List.of(501L), response.getGoingSeatIds());
    }
}
