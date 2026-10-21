package com.spring.boot;

import com.spring.boot.controller.HotelController;
import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.HotelBookingRequestDto;
import com.spring.boot.dto.RoomDto;
import com.spring.boot.enums.Role;
import com.spring.boot.enums.RoomType;
import com.spring.boot.exception.BookingConflictException;
import com.spring.boot.exception.GlobalExceptionHandler;
import com.spring.boot.exception.RoomUnavailableException;
import com.spring.boot.model.Hotel;
import com.spring.boot.model.HotelBookingRoom;
import com.spring.boot.model.Room;
import com.spring.boot.model.User;
import com.spring.boot.repository.HotelBookingRepository;
import com.spring.boot.repository.HotelBookingRoomRepository;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.repository.RoomRepository;
import com.spring.boot.repository.UserRepository;
import com.spring.boot.service.ai.AiTools;
import com.spring.boot.service.interfaces.HotelBookingService;
import com.spring.boot.service.interfaces.RoomService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.core.PropertyReferenceException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class MultiRoomAndPaginationTest {

    @Autowired
    private HotelController hotelController;

    @Autowired
    private GlobalExceptionHandler globalExceptionHandler;

    @Autowired
    private HotelBookingService hotelBookingService;

    @Autowired
    private RoomService roomService;

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
    private Hotel hotelA;
    private Hotel hotelB;
    private Room roomA1;
    private Room roomA2;
    private Room roomA3;
    private Room roomB1;

    private final List<Long> createdBookingIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setName("Test User " + System.currentTimeMillis());
        testUser.setEmail("test" + System.nanoTime() + "@example.com");
        testUser.setPassword("password123");
        testUser.setRole(Role.USER);
        testUser = userRepository.save(testUser);

        hotelA = new Hotel();
        hotelA.setName("Grand Hotel " + System.currentTimeMillis());
        hotelA.setCity("Paris");
        hotelA.setAddress("123 Main St");
        hotelA.setRating(4.5);
        hotelA = hotelRepository.save(hotelA);

        hotelB = new Hotel();
        hotelB.setName("Ocean Resort " + System.currentTimeMillis());
        hotelB.setCity("Nice");
        hotelB.setAddress("456 Beach Rd");
        hotelB.setRating(4.8);
        hotelB = hotelRepository.save(hotelB);

        roomA1 = new Room();
        roomA1.setRoomNumber("101");
        roomA1.setRoomType(RoomType.DOUBLE);
        roomA1.setCapacity(2);
        roomA1.setPricePerNight(100.0);
        roomA1.setHotel(hotelA);
        roomA1 = roomRepository.save(roomA1);

        roomA2 = new Room();
        roomA2.setRoomNumber("102");
        roomA2.setRoomType(RoomType.SINGLE);
        roomA2.setCapacity(1);
        roomA2.setPricePerNight(80.0);
        roomA2.setHotel(hotelA);
        roomA2 = roomRepository.save(roomA2);

        roomA3 = new Room();
        roomA3.setRoomNumber("103");
        roomA3.setRoomType(RoomType.DOUBLE);
        roomA3.setCapacity(2);
        roomA3.setPricePerNight(120.0);
        roomA3.setHotel(hotelA);
        roomA3 = roomRepository.save(roomA3);

        roomB1 = new Room();
        roomB1.setRoomNumber("201");
        roomB1.setRoomType(RoomType.DOUBLE);
        roomB1.setCapacity(2);
        roomB1.setPricePerNight(150.0);
        roomB1.setHotel(hotelB);
        roomB1 = roomRepository.save(roomB1);
    }

    @AfterEach
    void tearDown() {
        for (Long bookingId : createdBookingIds) {
            try {
                hotelBookingService.deleteHotelBooking(bookingId);
            } catch (Exception ignored) {
            }
        }
        try {
            roomRepository.deleteAll(List.of(roomA1, roomA2, roomA3, roomB1));
        } catch (Exception ignored) {
        }
        try {
            hotelRepository.deleteAll(List.of(hotelA, hotelB));
        } catch (Exception ignored) {
        }
        try {
            userRepository.delete(testUser);
        } catch (Exception ignored) {
        }
    }

    @Test
    void test1_bookMultipleRoomsInSameHotel() {
        LocalDate checkIn = LocalDate.now().plusDays(10);
        LocalDate checkOut = LocalDate.now().plusDays(12); // 2 nights

        HotelBookingRequestDto request = new HotelBookingRequestDto();
        request.setCheckIn(checkIn);
        request.setCheckOut(checkOut);
        request.setGuests(3);
        request.setRoomIds(List.of(roomA1.getId(), roomA2.getId()));

        HotelBookingDto response = hotelBookingService.createHotelBooking(request, testUser.getId());
        createdBookingIds.add(response.getId());

        assertNotNull(response.getId());
        assertEquals(2, response.getRooms().size());
        assertEquals(new BigDecimal("360.00").stripTrailingZeros(), response.getTotalPrice().stripTrailingZeros());
        assertEquals(roomA1.getId(), response.getRoomId()); // backward compatible roomId

        List<HotelBookingRoom> bookingRooms = hotelBookingRoomRepository.findByHotelBookingId(response.getId());
        assertEquals(2, bookingRooms.size());
    }

    @Test
    void test2_bookUnavailableRoomFailsEntireRequest() {
        LocalDate checkIn = LocalDate.now().plusDays(15);
        LocalDate checkOut = LocalDate.now().plusDays(17);

        HotelBookingRequestDto req1 = new HotelBookingRequestDto();
        req1.setCheckIn(checkIn);
        req1.setCheckOut(checkOut);
        req1.setGuests(2);
        req1.setRoomIds(List.of(roomA1.getId()));
        HotelBookingDto b1 = hotelBookingService.createHotelBooking(req1, testUser.getId());
        createdBookingIds.add(b1.getId());

        long initialBookingsCount = hotelBookingRepository.count();
        long initialBookingRoomsCount = hotelBookingRoomRepository.count();

        HotelBookingRequestDto req2 = new HotelBookingRequestDto();
        req2.setCheckIn(checkIn);
        req2.setCheckOut(checkOut);
        req2.setGuests(3);
        req2.setRoomIds(List.of(roomA1.getId(), roomA2.getId()));

        assertThrows(RoomUnavailableException.class, () -> {
            hotelBookingService.createHotelBooking(req2, testUser.getId());
        });

        assertEquals(initialBookingsCount, hotelBookingRepository.count());
        assertEquals(initialBookingRoomsCount, hotelBookingRoomRepository.count());
    }

    @Test
    void test3_bookRoomsFromDifferentHotelsRejected() {
        LocalDate checkIn = LocalDate.now().plusDays(25);
        LocalDate checkOut = LocalDate.now().plusDays(27);

        HotelBookingRequestDto request = new HotelBookingRequestDto();
        request.setCheckIn(checkIn);
        request.setCheckOut(checkOut);
        request.setGuests(4);
        request.setRoomIds(List.of(roomA1.getId(), roomB1.getId()));

        assertThrows(BookingConflictException.class, () -> {
            hotelBookingService.createHotelBooking(request, testUser.getId());
        });
    }

    @Test
    void test4_myBookingsAndDetailShowAllRooms() {
        LocalDate checkIn = LocalDate.now().plusDays(35);
        LocalDate checkOut = LocalDate.now().plusDays(38);

        HotelBookingRequestDto request = new HotelBookingRequestDto();
        request.setCheckIn(checkIn);
        request.setCheckOut(checkOut);
        request.setGuests(3);
        request.setRoomIds(List.of(roomA1.getId(), roomA2.getId()));

        HotelBookingDto created = hotelBookingService.createHotelBooking(request, testUser.getId());
        createdBookingIds.add(created.getId());

        HotelBookingDto detail = hotelBookingService.getHotelBookingById(created.getId());
        assertEquals(2, detail.getRooms().size());

        List<HotelBookingDto> myBookings = hotelBookingService.getMyHotelBookings(testUser.getId());
        assertEquals(1, myBookings.size());
        assertEquals(2, myBookings.get(0).getRooms().size());
    }

    @Test
    void test5_paginationOnRooms() {
        Page<RoomDto> page0 = roomService.getRoomsByHotelId(hotelA.getId(), PageRequest.of(0, 2));
        assertEquals(2, page0.getContent().size());
        assertEquals(3, page0.getTotalElements());
        assertEquals(2, page0.getTotalPages());

        Page<RoomDto> page1 = roomService.getRoomsByHotelId(hotelA.getId(), PageRequest.of(1, 2));
        assertEquals(1, page1.getContent().size());

        Page<RoomDto> sorted = roomService.getRoomsByHotelId(hotelA.getId(), PageRequest.of(0, 10, Sort.by("roomNumber").descending()));
        assertEquals("103", sorted.getContent().get(0).getRoomNumber());
    }

    @Test
    void test6_singleRoomLegacyFlowAndAiToolsWork() {
        LocalDate checkIn = LocalDate.now().plusDays(45);
        LocalDate checkOut = LocalDate.now().plusDays(47);

        HotelBookingRequestDto legacyReq = new HotelBookingRequestDto(checkIn, checkOut, 1, roomA2.getId());
        HotelBookingDto legacyBooking = hotelBookingService.createHotelBooking(legacyReq, testUser.getId());
        createdBookingIds.add(legacyBooking.getId());

        assertNotNull(legacyBooking.getId());
        assertEquals(1, legacyBooking.getRooms().size());
        assertEquals(roomA2.getId(), legacyBooking.getRoomId());

        List<RoomDto> availableRooms = aiTools.checkRoomAvailability(hotelA.getId(), checkIn, checkOut, 1);
        List<Long> availableIds = availableRooms.stream().map(RoomDto::getId).toList();
        assertTrue(availableIds.contains(roomA1.getId()));
        assertTrue(availableIds.contains(roomA3.getId()));
        assertFalse(availableIds.contains(roomA2.getId()));
    }

    @Test
    void test7_controllerEndpointAndInvalidSortHandling() {
        // Test controller endpoint: GET /api/hotels/{id}/rooms
        ResponseEntity<PagedModel<RoomDto>> responsePage0 = hotelController.getRooms(hotelA.getId(), PageRequest.of(0, 2));
        assertEquals(HttpStatus.OK, responsePage0.getStatusCode());
        assertNotNull(responsePage0.getBody());
        assertEquals(2, responsePage0.getBody().getContent().size());

        ResponseEntity<PagedModel<RoomDto>> responsePage1 = hotelController.getRooms(hotelA.getId(), PageRequest.of(1, 2));
        assertEquals(HttpStatus.OK, responsePage1.getStatusCode());
        assertNotNull(responsePage1.getBody());
        assertEquals(1, responsePage1.getBody().getContent().size());

        // Test invalid sort field throws PropertyReferenceException
        PropertyReferenceException prefEx = assertThrows(PropertyReferenceException.class, () -> {
            roomService.getRoomsByHotelId(hotelA.getId(), PageRequest.of(0, 10, Sort.by("nonExistentField")));
        });

        // Test GlobalExceptionHandler handles PropertyReferenceException and maps to HTTP 400 Bad Request
        ResponseEntity<String> errorResponse = globalExceptionHandler.handlePropertyReferenceException(prefEx);
        assertEquals(HttpStatus.BAD_REQUEST, errorResponse.getStatusCode());
        assertEquals("Invalid sort property", errorResponse.getBody());
    }
}
