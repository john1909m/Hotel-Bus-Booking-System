package com.spring.boot;

import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.HotelBookingRequestDto;
import com.spring.boot.dto.RoomDto;
import com.spring.boot.dto.ai.BookingDraftRequest;
import com.spring.boot.dto.ai.BookingDraftResponse;
import com.spring.boot.enums.Role;
import com.spring.boot.enums.RoomType;
import com.spring.boot.exception.InvalidGuestCountException;
import com.spring.boot.model.Hotel;
import com.spring.boot.model.Room;
import com.spring.boot.model.User;
import com.spring.boot.repository.HotelBookingRepository;
import com.spring.boot.repository.HotelBookingRoomRepository;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.repository.RoomRepository;
import com.spring.boot.repository.UserRepository;
import com.spring.boot.service.ai.AiTools;
import com.spring.boot.service.interfaces.BookingDraftService;
import com.spring.boot.service.interfaces.HotelBookingService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class ChildAgeCapacityTest {

    @Autowired
    private HotelBookingService hotelBookingService;

    @Autowired
    private BookingDraftService bookingDraftService;

    @Autowired
    private AiTools aiTools;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HotelBookingRepository hotelBookingRepository;

    @Autowired
    private HotelBookingRoomRepository hotelBookingRoomRepository;

    private User testUser;
    private Hotel testHotel;
    private Room roomCap2A;
    private Room roomCap2B;
    private Room roomCap1;

    private final List<Long> createdBookingIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setName("Capacity Test User " + System.currentTimeMillis());
        testUser.setEmail("capacity" + System.nanoTime() + "@example.com");
        testUser.setPassword("password123");
        testUser.setRole(Role.USER);
        testUser = userRepository.save(testUser);

        testHotel = new Hotel();
        testHotel.setName("Capacity Test Hotel " + System.currentTimeMillis());
        testHotel.setCity("Rome");
        testHotel.setAddress("Via Roma 1");
        testHotel.setRating(4.5);
        testHotel = hotelRepository.save(testHotel);

        // Room 1: Capacity 2
        roomCap2A = new Room();
        roomCap2A.setRoomNumber("C101");
        roomCap2A.setRoomType(RoomType.DOUBLE);
        roomCap2A.setCapacity(2);
        roomCap2A.setPricePerNight(100.0);
        roomCap2A.setHotel(testHotel);
        roomCap2A = roomRepository.save(roomCap2A);

        // Room 2: Capacity 2
        roomCap2B = new Room();
        roomCap2B.setRoomNumber("C102");
        roomCap2B.setRoomType(RoomType.DOUBLE);
        roomCap2B.setCapacity(2);
        roomCap2B.setPricePerNight(110.0);
        roomCap2B.setHotel(testHotel);
        roomCap2B = roomRepository.save(roomCap2B);

        // Room 3: Capacity 1
        roomCap1 = new Room();
        roomCap1.setRoomNumber("C103");
        roomCap1.setRoomType(RoomType.SINGLE);
        roomCap1.setCapacity(1);
        roomCap1.setPricePerNight(70.0);
        roomCap1.setHotel(testHotel);
        roomCap1 = roomRepository.save(roomCap1);
    }

    @AfterEach
    void tearDown() {
        for (Long bookingId : createdBookingIds) {
            try {
                hotelBookingService.deleteHotelBooking(bookingId);
            } catch (Exception ignored) {
            }
        }
        createdBookingIds.clear();

        try {
            roomRepository.deleteAll(List.of(roomCap2A, roomCap2B, roomCap1));
        } catch (Exception ignored) {
        }
        try {
            hotelRepository.delete(testHotel);
        } catch (Exception ignored) {
        }
        try {
            userRepository.delete(testUser);
        } catch (Exception ignored) {
        }
    }

    @Test
    void test1_singleRoom_capacity2_adults2_childAge8_fits() {
        // 1 room, capacity 2: adults=2, childAges=[8] -> fits (child under 12 is free)
        LocalDate checkIn = LocalDate.now().plusDays(2);
        LocalDate checkOut = LocalDate.now().plusDays(4);

        HotelBookingRequestDto request = new HotelBookingRequestDto();
        request.setCheckIn(checkIn);
        request.setCheckOut(checkOut);
        request.setAdults(2);
        request.setChildAges(List.of(8));
        request.setRoomId(roomCap2A.getId());

        HotelBookingDto dto = hotelBookingService.createHotelBooking(request, testUser.getId());
        createdBookingIds.add(dto.getId());

        assertNotNull(dto.getId());
        assertEquals(2, dto.getAdults());
        assertEquals(List.of(8), dto.getChildAges());
        assertEquals(3, dto.getGuests()); // total occupants: 2 adults + 1 child
    }

    @Test
    void test2_singleRoom_capacity2_adults2_childAge13_rejected() {
        // 1 room, capacity 2: adults=2, childAges=[13] -> rejected, needs capacity 3
        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOut = LocalDate.now().plusDays(7);

        HotelBookingRequestDto request = new HotelBookingRequestDto();
        request.setCheckIn(checkIn);
        request.setCheckOut(checkOut);
        request.setAdults(2);
        request.setChildAges(List.of(13));
        request.setRoomId(roomCap2A.getId());

        InvalidGuestCountException ex = assertThrows(InvalidGuestCountException.class, () -> {
            hotelBookingService.createHotelBooking(request, testUser.getId());
        });
        assertTrue(ex.getMessage().contains("capacity") || ex.getMessage().contains("Guest count"));
    }

    @Test
    void test3_singleRoom_capacity2_adults2_childAges8and9_fits() {
        // 1 room, capacity 2: adults=2, childAges=[8,9] -> fits (both free)
        LocalDate checkIn = LocalDate.now().plusDays(8);
        LocalDate checkOut = LocalDate.now().plusDays(10);

        HotelBookingRequestDto request = new HotelBookingRequestDto();
        request.setCheckIn(checkIn);
        request.setCheckOut(checkOut);
        request.setAdults(2);
        request.setChildAges(List.of(8, 9));
        request.setRoomId(roomCap2A.getId());

        HotelBookingDto dto = hotelBookingService.createHotelBooking(request, testUser.getId());
        createdBookingIds.add(dto.getId());

        assertNotNull(dto.getId());
        assertEquals(2, dto.getAdults());
        assertEquals(List.of(8, 9), dto.getChildAges());
        assertEquals(4, dto.getGuests()); // total occupants
    }

    @Test
    void test4_singleRoom_capacity2_adults2_childAges8and13_rejected() {
        // 1 room, capacity 2: adults=2, childAges=[8,13] -> needs capacity 3, check against room capacity
        LocalDate checkIn = LocalDate.now().plusDays(11);
        LocalDate checkOut = LocalDate.now().plusDays(13);

        HotelBookingRequestDto request = new HotelBookingRequestDto();
        request.setCheckIn(checkIn);
        request.setCheckOut(checkOut);
        request.setAdults(2);
        request.setChildAges(List.of(8, 13));
        request.setRoomId(roomCap2A.getId());

        assertThrows(InvalidGuestCountException.class, () -> {
            hotelBookingService.createHotelBooking(request, testUser.getId());
        });
    }

    @Test
    void test5_multiRoom_2doubleRooms_adults3_childAges5and13_fitsExactly() {
        // Multi-room booking: 2 double rooms (capacity 2 each, total 4)
        // adults=3, childAges=[5,13] -> required = 3 adults + 1 (the 13-year-old) = 4, fits exactly
        LocalDate checkIn = LocalDate.now().plusDays(14);
        LocalDate checkOut = LocalDate.now().plusDays(16);

        HotelBookingRequestDto request = new HotelBookingRequestDto();
        request.setCheckIn(checkIn);
        request.setCheckOut(checkOut);
        request.setAdults(3);
        request.setChildAges(List.of(5, 13));
        request.setRoomIds(List.of(roomCap2A.getId(), roomCap2B.getId()));

        HotelBookingDto dto = hotelBookingService.createHotelBooking(request, testUser.getId());
        createdBookingIds.add(dto.getId());

        assertNotNull(dto.getId());
        assertEquals(3, dto.getAdults());
        assertEquals(List.of(5, 13), dto.getChildAges());
        assertEquals(5, dto.getGuests()); // total occupants: 3 + 2
        assertEquals(2, dto.getRooms().size());
    }

    @Test
    void test6_invalidChildAge_rejectedWithI18nMessage() {
        LocalDate checkIn = LocalDate.now().plusDays(17);
        LocalDate checkOut = LocalDate.now().plusDays(19);

        // Negative age -1
        HotelBookingRequestDto requestNegative = new HotelBookingRequestDto();
        requestNegative.setCheckIn(checkIn);
        requestNegative.setCheckOut(checkOut);
        requestNegative.setAdults(2);
        requestNegative.setChildAges(List.of(-1));
        requestNegative.setRoomId(roomCap2A.getId());

        InvalidGuestCountException ex1 = assertThrows(InvalidGuestCountException.class, () -> {
            hotelBookingService.createHotelBooking(requestNegative, testUser.getId());
        });
        assertEquals("Child age must be between 0 and 17", ex1.getMessage());

        // Absurd age 200
        HotelBookingRequestDto request200 = new HotelBookingRequestDto();
        request200.setCheckIn(checkIn);
        request200.setCheckOut(checkOut);
        request200.setAdults(2);
        request200.setChildAges(List.of(200));
        request200.setRoomId(roomCap2A.getId());

        InvalidGuestCountException ex2 = assertThrows(InvalidGuestCountException.class, () -> {
            hotelBookingService.createHotelBooking(request200, testUser.getId());
        });
        assertEquals("Child age must be between 0 and 17", ex2.getMessage());
    }

    @Test
    void test7_invalidAdults_rejectedWithI18nMessage() {
        LocalDate checkIn = LocalDate.now().plusDays(20);
        LocalDate checkOut = LocalDate.now().plusDays(22);

        HotelBookingRequestDto reqZeroAdults = new HotelBookingRequestDto();
        reqZeroAdults.setCheckIn(checkIn);
        reqZeroAdults.setCheckOut(checkOut);
        reqZeroAdults.setAdults(0);
        reqZeroAdults.setRoomId(roomCap2A.getId());

        InvalidGuestCountException ex = assertThrows(InvalidGuestCountException.class, () -> {
            hotelBookingService.createHotelBooking(reqZeroAdults, testUser.getId());
        });
        assertEquals("Adults count must be at least 1", ex.getMessage());
    }

    @Test
    void test8_backwardCompatibility_plainGuestsWorks() {
        // Old callers that still send a plain guests number keep working (backward compatible path)
        LocalDate checkIn = LocalDate.now().plusDays(23);
        LocalDate checkOut = LocalDate.now().plusDays(25);

        HotelBookingRequestDto legacyRequest = new HotelBookingRequestDto();
        legacyRequest.setCheckIn(checkIn);
        legacyRequest.setCheckOut(checkOut);
        legacyRequest.setGuests(2);
        legacyRequest.setRoomId(roomCap2A.getId());

        HotelBookingDto dto = hotelBookingService.createHotelBooking(legacyRequest, testUser.getId());
        createdBookingIds.add(dto.getId());

        assertNotNull(dto.getId());
        assertEquals(2, dto.getAdults());
        assertEquals(2, dto.getGuests());
        assertEquals(Collections.emptyList(), dto.getChildAges());
    }

    @Test
    void test9_aiAssistant_roomAvailabilityTool_freeChildRule() {
        LocalDate checkIn = LocalDate.now().plusDays(26);
        LocalDate checkOut = LocalDate.now().plusDays(28);

        // 2 adults and 6 year old child -> required capacity 2.
        // Should return rooms with capacity >= 2 (roomCap2A, roomCap2B), not roomCap1 (capacity 1).
        List<RoomDto> available = aiTools.checkRoomAvailability(testHotel.getId(), checkIn, checkOut, 2, List.of(6));
        assertEquals(2, available.size());
        assertTrue(available.stream().allMatch(r -> r.getCapacity() >= 2));

        // 2 adults and 13 year old child -> required capacity 3.
        // Neither room fits (capacities are 2, 2, 1). Returns empty.
        List<RoomDto> noneAvailable = aiTools.checkRoomAvailability(testHotel.getId(), checkIn, checkOut, 2, List.of(13));
        assertTrue(noneAvailable.isEmpty());

        // Backward compatibility overload: 1 guest
        List<RoomDto> singleGuestRooms = aiTools.checkRoomAvailability(testHotel.getId(), checkIn, checkOut, 1);
        assertEquals(3, singleGuestRooms.size());
    }

    @Test
    void test10_bookingDraftService_freeChildCapacityRule() {
        LocalDate checkIn = LocalDate.now().plusDays(29);
        LocalDate checkOut = LocalDate.now().plusDays(31);

        // 2 adults and 8 year old child in room of capacity 2 -> fits!
        BookingDraftRequest draftReq = new BookingDraftRequest(
                testHotel.getId(),
                roomCap2A.getId(),
                checkIn,
                checkOut,
                null,
                2,
                List.of(8),
                null, null, null, null
        );

        BookingDraftResponse response = bookingDraftService.createDraft(testUser.getId(), draftReq);
        assertNotNull(response.getId());
        assertEquals(2, response.getAdults());
        assertEquals(List.of(8), response.getChildAges());
        assertEquals(3, response.getGuests());

        // 2 adults and 13 year old child in room of capacity 2 -> rejected
        BookingDraftRequest draftReqOver = new BookingDraftRequest(
                testHotel.getId(),
                roomCap2A.getId(),
                checkIn,
                checkOut,
                null,
                2,
                List.of(13),
                null, null, null, null
        );

        assertThrows(InvalidGuestCountException.class, () -> {
            bookingDraftService.createDraft(testUser.getId(), draftReqOver);
        });
    }
}
