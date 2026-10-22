package com.spring.boot;

import com.spring.boot.dto.*;
import com.spring.boot.dto.ai.AiMessageDto;
import com.spring.boot.dto.ai.AiResult;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.BusTripStatus;
import com.spring.boot.enums.Role;
import com.spring.boot.enums.RoomType;
import com.spring.boot.model.*;
import com.spring.boot.repository.*;
import com.spring.boot.service.AiAssistantService;
import com.spring.boot.service.SystemPromptService;
import com.spring.boot.service.ai.AiToolContext;
import com.spring.boot.service.ai.AiToolContextHolder;
import com.spring.boot.service.ai.AiTools;
import com.spring.boot.service.interfaces.HotelBookingService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class AiBookingAgentTest {

    @Autowired
    private AiTools aiTools;

    @Autowired
    private AiAssistantService aiAssistantService;

    @Autowired
    private SystemPromptService systemPromptService;

    @Autowired
    private ChatMemory chatMemory;

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

    @Autowired
    private BusStopRepository busStopRepository;

    @Autowired
    private BusRouteRepository busRouteRepository;

    @Autowired
    private BusRepository busRepository;

    @Autowired
    private BusTripRepository busTripRepository;

    @Autowired
    private BusBookingRepository busBookingRepository;

    private User userA;
    private User userB;
    private Hotel pharaohsHotel;
    private Hotel redSeaHotel;
    private Room pharaohsRoomAffordable;
    private Room pharaohsRoomLuxury;
    private HotelBooking userAHotelBooking;
    private HotelBooking userBHotelBooking;
    private BusStop cairoStop;
    private BusStop hurghadaStop;
    private BusRoute cairoHurghadaRoute;
    private Bus testBus;
    private BusTrip testTrip;
    private BusBooking userABusBooking;

    private final List<Long> cleanupHotelBookingIds = new ArrayList<>();
    private final List<Long> cleanupBusBookingIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        // Create authenticated test users
        userA = new User();
        userA.setName("Test User A " + System.currentTimeMillis());
        userA.setEmail("userA_" + System.nanoTime() + "@test.com");
        userA.setPassword("pass123");
        userA.setRole(Role.USER);
        userA = userRepository.save(userA);

        userB = new User();
        userB.setName("Test User B " + System.currentTimeMillis());
        userB.setEmail("userB_" + System.nanoTime() + "@test.com");
        userB.setPassword("pass123");
        userB.setRole(Role.USER);
        userB = userRepository.save(userB);

        // Create test hotels
        pharaohsHotel = new Hotel();
        pharaohsHotel.setName("Pharaohs Hotel Cairo " + System.currentTimeMillis());
        pharaohsHotel.setCity("Cairo");
        pharaohsHotel.setAddress("123 Nile Corniche, Cairo");
        pharaohsHotel.setRating(4.8);
        pharaohsHotel = hotelRepository.save(pharaohsHotel);

        redSeaHotel = new Hotel();
        redSeaHotel.setName("Red Sea Resort Hurghada " + System.currentTimeMillis());
        redSeaHotel.setCity("Hurghada");
        redSeaHotel.setAddress("456 Marina, Hurghada");
        redSeaHotel.setRating(4.2);
        redSeaHotel = hotelRepository.save(redSeaHotel);

        // Rooms for Pharaohs Hotel
        pharaohsRoomAffordable = new Room();
        pharaohsRoomAffordable.setRoomNumber("PH-101");
        pharaohsRoomAffordable.setRoomType(RoomType.DOUBLE);
        pharaohsRoomAffordable.setCapacity(2);
        pharaohsRoomAffordable.setPricePerNight(1500.0);
        pharaohsRoomAffordable.setHotel(pharaohsHotel);
        pharaohsRoomAffordable = roomRepository.save(pharaohsRoomAffordable);

        pharaohsRoomLuxury = new Room();
        pharaohsRoomLuxury.setRoomNumber("PH-501");
        pharaohsRoomLuxury.setRoomType(RoomType.SUITE);
        pharaohsRoomLuxury.setCapacity(4);
        pharaohsRoomLuxury.setPricePerNight(3500.0);
        pharaohsRoomLuxury.setHotel(pharaohsHotel);
        pharaohsRoomLuxury = roomRepository.save(pharaohsRoomLuxury);

        // Hotel Booking for User A
        userAHotelBooking = new HotelBooking();
        userAHotelBooking.setUser(userA);
        userAHotelBooking.setHotel(pharaohsHotel);
        userAHotelBooking.setCheckIn(LocalDate.of(2026, 11, 1));
        userAHotelBooking.setCheckOut(LocalDate.of(2026, 11, 5));
        userAHotelBooking.setGuests(2);
        userAHotelBooking.setStatus(BookingStatus.CONFIRMED);
        userAHotelBooking.setTotalPrice(BigDecimal.valueOf(6000));

        HotelBookingRoom bookingRoom = new HotelBookingRoom();
        bookingRoom.setHotelBooking(userAHotelBooking);
        bookingRoom.setRoom(pharaohsRoomAffordable);
        bookingRoom.setPricePerNight(1500.0);
        userAHotelBooking.getBookingRooms().add(bookingRoom);
        userAHotelBooking = hotelBookingRepository.save(userAHotelBooking);
        cleanupHotelBookingIds.add(userAHotelBooking.getId());

        // Hotel Booking for User B
        userBHotelBooking = new HotelBooking();
        userBHotelBooking.setUser(userB);
        userBHotelBooking.setHotel(redSeaHotel);
        userBHotelBooking.setCheckIn(LocalDate.of(2026, 12, 1));
        userBHotelBooking.setCheckOut(LocalDate.of(2026, 12, 3));
        userBHotelBooking.setGuests(1);
        userBHotelBooking.setStatus(BookingStatus.CONFIRMED);
        userBHotelBooking.setTotalPrice(BigDecimal.valueOf(2000));
        userBHotelBooking = hotelBookingRepository.save(userBHotelBooking);
        cleanupHotelBookingIds.add(userBHotelBooking.getId());

        // Bus Stops
        cairoStop = new BusStop();
        cairoStop.setName("Tahrir Central Station " + System.currentTimeMillis());
        cairoStop.setCity("Cairo");
        cairoStop.setAddress("Tahrir Square, Cairo");
        cairoStop = busStopRepository.save(cairoStop);

        hurghadaStop = new BusStop();
        hurghadaStop.setName("Hurghada Bus Terminal " + System.currentTimeMillis());
        hurghadaStop.setCity("Hurghada");
        hurghadaStop.setAddress("El Dahar, Hurghada");
        hurghadaStop = busStopRepository.save(hurghadaStop);

        // Bus Route
        cairoHurghadaRoute = new BusRoute();
        cairoHurghadaRoute.setName("Cairo - Hurghada Express " + System.currentTimeMillis());
        cairoHurghadaRoute.setDuration(360);
        cairoHurghadaRoute.setOriginStop(cairoStop);
        cairoHurghadaRoute.setDestinationStop(hurghadaStop);
        cairoHurghadaRoute = busRouteRepository.save(cairoHurghadaRoute);

        // Bus
        testBus = new Bus();
        testBus.setBusNumber("EG-BUS-" + System.currentTimeMillis());
        testBus.setCompany("Go Bus Egypt");
        testBus.setCapacity(45);
        testBus.setBusType("SUPER_VIP");
        testBus = busRepository.save(testBus);

        // Bus Trip
        testTrip = new BusTrip();
        testTrip.setBus(testBus);
        testTrip.setRoute(cairoHurghadaRoute);
        testTrip.setDepartureTime(LocalDateTime.of(2026, 11, 1, 8, 0));
        testTrip.setArrivalTime(LocalDateTime.of(2026, 11, 1, 14, 0));
        testTrip.setPrice(BigDecimal.valueOf(250));
        testTrip.setStatus(BusTripStatus.SCHEDULED);
        testTrip = busTripRepository.save(testTrip);

        // Bus Booking for User A
        userABusBooking = new BusBooking();
        userABusBooking.setUser(userA);
        userABusBooking.setBusTrip(testTrip);
        userABusBooking.setBookingDate(LocalDate.of(2026, 10, 22));
        userABusBooking.setStatus(BookingStatus.CONFIRMED);
        userABusBooking.setPrice(BigDecimal.valueOf(250));
        userABusBooking = busBookingRepository.save(userABusBooking);
        cleanupBusBookingIds.add(userABusBooking.getId());
    }

    @AfterEach
    void tearDown() {
        AiToolContextHolder.clearContext();

        for (Long bId : cleanupBusBookingIds) {
            try { busBookingRepository.deleteById(bId); } catch (Exception ignored) {}
        }
        cleanupBusBookingIds.clear();

        for (Long hId : cleanupHotelBookingIds) {
            try {
                hotelBookingRepository.deleteById(hId);
            } catch (Exception ignored) {}
        }
        cleanupHotelBookingIds.clear();

        try { busTripRepository.delete(testTrip); } catch (Exception ignored) {}
        try { busRouteRepository.delete(cairoHurghadaRoute); } catch (Exception ignored) {}
        try { busRepository.delete(testBus); } catch (Exception ignored) {}
        try { busStopRepository.delete(hurghadaStop); } catch (Exception ignored) {}
        try { busStopRepository.delete(cairoStop); } catch (Exception ignored) {}

        try { roomRepository.deleteAll(List.of(pharaohsRoomAffordable, pharaohsRoomLuxury)); } catch (Exception ignored) {}
        try { hotelRepository.delete(pharaohsHotel); } catch (Exception ignored) {}
        try { hotelRepository.delete(redSeaHotel); } catch (Exception ignored) {}

        try { userRepository.delete(userA); } catch (Exception ignored) {}
        try { userRepository.delete(userB); } catch (Exception ignored) {}
    }

    @Test
    @DisplayName("Scenario 1: Search for an existing hotel by its exact name")
    void test1_searchHotelByExactName() {
        AiToolContext context = new AiToolContext();
        AiToolContextHolder.setContext(context);

        List<HotelDto> results = aiTools.searchHotels(pharaohsHotel.getName(), null, null, null);

        assertNotNull(results, "Search results should not be null");
        assertFalse(results.isEmpty(), "Should find the hotel by exact name");
        assertTrue(results.stream().anyMatch(h -> h.getId().equals(pharaohsHotel.getId())),
                "Result should contain Pharaohs Hotel");

        // Verify tool context recorded HOTEL result
        List<AiResult> toolResults = context.getResults();
        assertFalse(toolResults.isEmpty(), "Tool context should record the tool result");
        assertEquals("HOTEL", toolResults.get(0).type());
    }

    @Test
    @DisplayName("Scenario 2: Search using a partial or differently capitalized hotel name")
    void test2_searchHotelByPartialAndDifferentCasing() {
        AiToolContext context = new AiToolContext();
        AiToolContextHolder.setContext(context);

        // Lowercase partial search: "pharaohs"
        List<HotelDto> lowerResults = aiTools.searchHotels("pharaohs", null, null, null);
        assertFalse(lowerResults.isEmpty(), "Lowercase partial search 'pharaohs' should find Pharaohs Hotel");
        assertTrue(lowerResults.stream().anyMatch(h -> h.getId().equals(pharaohsHotel.getId())));

        // Uppercase search: "PHARAOHS"
        List<HotelDto> upperResults = aiTools.searchHotels("PHARAOHS", null, null, null);
        assertFalse(upperResults.isEmpty(), "Uppercase search 'PHARAOHS' should find Pharaohs Hotel");
        assertTrue(upperResults.stream().anyMatch(h -> h.getId().equals(pharaohsHotel.getId())));
    }

    @Test
    @DisplayName("Scenario 3: Search for a nonexistent hotel")
    void test3_searchNonexistentHotel() {
        AiToolContext context = new AiToolContext();
        AiToolContextHolder.setContext(context);

        List<HotelDto> results = aiTools.searchHotels("Atlantis Nonexistent Castle XYZ", null, null, null);

        assertNotNull(results);
        assertTrue(results.isEmpty(), "Search for nonexistent hotel must return empty list, never fabricate");
    }

    @Test
    @DisplayName("Scenario 4: Search by city without specifying a hotel name")
    void test4_searchHotelsByCityWithoutName() {
        AiToolContext context = new AiToolContext();
        AiToolContextHolder.setContext(context);

        List<HotelDto> cairoHotels = aiTools.searchHotels(null, "Cairo", null, null);

        assertFalse(cairoHotels.isEmpty(), "Should find hotels in Cairo");
        assertTrue(cairoHotels.stream().allMatch(h -> "Cairo".equalsIgnoreCase(h.getCity())),
                "All returned hotels must be in Cairo");
        assertTrue(cairoHotels.stream().anyMatch(h -> h.getId().equals(pharaohsHotel.getId())));
    }

    @Test
    @DisplayName("Scenario 5: Search by city and price range together")
    void test5_searchHotelsByCityAndPriceRange() {
        AiToolContext context = new AiToolContext();
        AiToolContextHolder.setContext(context);

        // Price ceiling: 2000 EGP (roomAffordable is 1500, roomLuxury is 3500)
        List<HotelDto> affordableCairoHotels = aiTools.searchHotels(null, "Cairo", 2000.0, null);

        assertFalse(affordableCairoHotels.isEmpty(), "Should find Cairo hotels with rooms <= 2000 EGP");
        assertTrue(affordableCairoHotels.stream().anyMatch(h -> h.getId().equals(pharaohsHotel.getId())),
                "Pharaohs Hotel should be included because it has a room for 1500 EGP");

        // Very low budget: 100 EGP -> should return empty
        List<HotelDto> impossibleBudgetHotels = aiTools.searchHotels(null, "Cairo", 100.0, null);
        assertTrue(impossibleBudgetHotels.stream().noneMatch(h -> h.getId().equals(pharaohsHotel.getId())),
                "Pharaohs Hotel must not be returned for budget under 100 EGP");
    }

    @Test
    @DisplayName("Scenario 6: Ask about hotels when the database returns no results")
    void test6_searchHotelsWhenDatabaseReturnsNoResults() {
        AiToolContext context = new AiToolContext();
        AiToolContextHolder.setContext(context);

        List<HotelDto> results = aiTools.searchHotels(null, "CityOnMars999", 50.0, 5.0);

        assertNotNull(results);
        assertTrue(results.isEmpty(), "Should return an empty list for unmatched criteria");
        // Verify tool context recorded HOTEL result even when empty
        assertEquals(1, context.getResults().size());
        assertEquals("HOTEL", context.getResults().get(0).type());
    }

    @Test
    @DisplayName("Scenario 7: Ask for bus routes between two cities")
    void test7_searchBusTripsBetweenCities() {
        AiToolContext context = new AiToolContext();
        AiToolContextHolder.setContext(context);

        // Search bus trips from Cairo to Hurghada
        List<BusTripInfoDto> trips = aiTools.searchBusTrips("Cairo", "Hurghada", null);

        assertNotNull(trips, "Bus trip results should not be null");
        assertFalse(trips.isEmpty(), "Should find bus trips between Cairo and Hurghada");

        BusTripInfoDto trip = trips.stream()
                .filter(t -> t.getId().equals(testTrip.getId()))
                .findFirst()
                .orElse(null);

        assertNotNull(trip, "Test trip should be present in results");
        assertEquals("Cairo", trip.getOriginCity());
        assertEquals("Hurghada", trip.getDestinationCity());
        assertEquals(BigDecimal.valueOf(250), trip.getPrice());
        assertEquals(BusTripStatus.SCHEDULED, trip.getStatus());

        // Also test with exact date filter
        List<BusTripInfoDto> dateTrips = aiTools.searchBusTrips("Cairo", "Hurghada", LocalDate.of(2026, 11, 1));
        assertFalse(dateTrips.isEmpty(), "Should find trip on 2026-11-01");

        // Verify context recorded BUS_SEARCH
        List<AiResult> toolResults = context.getResults();
        assertTrue(toolResults.stream().anyMatch(r -> "BUS_SEARCH".equals(r.type())));
    }

    @Test
    @DisplayName("Scenario 8: Ask about hotel availability for specific dates")
    void test8_checkHotelRoomAvailabilityForDates() {
        AiToolContext context = new AiToolContext();
        AiToolContextHolder.setContext(context);

        LocalDate checkIn = LocalDate.of(2026, 11, 10);
        LocalDate checkOut = LocalDate.of(2026, 11, 15);

        // 2 adults and 1 child age 5 (child < 12 does not count towards capacity -> required capacity = 2)
        List<RoomDto> availableRooms = aiTools.checkRoomAvailability(
                pharaohsHotel.getId(), checkIn, checkOut, 2, List.of(5));

        assertNotNull(availableRooms);
        assertFalse(availableRooms.isEmpty(), "Should find available rooms with capacity >= 2");
        assertTrue(availableRooms.stream().anyMatch(r -> r.getId().equals(pharaohsRoomAffordable.getId())));

        // Verify context recorded ROOM
        List<AiResult> toolResults = context.getResults();
        assertTrue(toolResults.stream().anyMatch(r -> "ROOM".equals(r.type())));
    }

    @Test
    @DisplayName("Scenario 9: Ask about a booking that belongs to the authenticated user")
    void test9_authenticatedUserBookingsSecurityAndRetrieval() {
        // User A context
        AiToolContext contextA = new AiToolContext();
        contextA.setUserId(userA.getId());
        AiToolContextHolder.setContext(contextA);

        UserBookingsDto bookingsA = aiTools.getMyBookings();

        assertNotNull(bookingsA);
        assertFalse(bookingsA.getHotelBookings().isEmpty(), "User A should see their hotel booking");
        assertEquals(userAHotelBooking.getId(), bookingsA.getHotelBookings().get(0).getId());
        assertFalse(bookingsA.getBusBookings().isEmpty(), "User A should see their bus booking");
        assertEquals(userABusBooking.getId(), bookingsA.getBusBookings().get(0).getId());

        // Verify User A NEVER sees User B's bookings
        assertTrue(bookingsA.getHotelBookings().stream().noneMatch(h -> h.getId().equals(userBHotelBooking.getId())),
                "User A must NOT see User B's hotel booking");

        // User B context
        AiToolContext contextB = new AiToolContext();
        contextB.setUserId(userB.getId());
        AiToolContextHolder.setContext(contextB);

        UserBookingsDto bookingsB = aiTools.getMyBookings();
        assertNotNull(bookingsB);
        assertEquals(1, bookingsB.getHotelBookings().size());
        assertEquals(userBHotelBooking.getId(), bookingsB.getHotelBookings().get(0).getId());
        assertTrue(bookingsB.getHotelBookings().stream().noneMatch(h -> h.getId().equals(userAHotelBooking.getId())),
                "User B must NOT see User A's hotel booking");
    }

    @Test
    @DisplayName("Scenario 10: Ask a question that requires clarification (reporting missing info)")
    void test10_reportMissingInformation() {
        AiToolContext context = new AiToolContext();
        AiToolContextHolder.setContext(context);

        aiTools.reportMissingInformation(List.of("checkInDate", "checkOutDate", "guests"));

        List<String> missing = context.getMissingInformation();
        assertNotNull(missing);
        assertTrue(missing.contains("checkInDate"));
        assertTrue(missing.contains("checkOutDate"));
        assertTrue(missing.contains("guests"));
    }

    @Test
    @DisplayName("Scenario 11: Simulate a backend/tool failure")
    void test11_simulateBackendToolFailure() {
        AiToolContext context = new AiToolContext();
        AiToolContextHolder.setContext(context);

        LocalDate checkIn = LocalDate.of(2026, 11, 15);
        LocalDate checkOut = LocalDate.of(2026, 11, 10); // checkOut before checkIn

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            aiTools.checkRoomAvailability(pharaohsHotel.getId(), checkIn, checkOut, 2, null);
        });

        assertEquals("Check-out must be after check-in", ex.getMessage());
    }

    @Test
    @DisplayName("Scenario 12: Multi-turn conversation context and user memory isolation")
    void test12_multiTurnConversationContext() {
        String convId = "conv-" + System.currentTimeMillis();
        String memoryKeyA = userA.getId() + ":" + convId;
        String memoryKeyB = userB.getId() + ":" + convId;

        // Turn 1 for User A: user asks about Pharaohs Hotel
        chatMemory.add(memoryKeyA, new UserMessage("Is Pharaohs Hotel available?"));
        chatMemory.add(memoryKeyA, new AssistantMessage("Yes, Pharaohs Hotel Cairo is available in Cairo with a 4.8 rating."));

        // Turn 2 for User A: user asks follow-up: "Does it have a pool and what are the rooms?"
        chatMemory.add(memoryKeyA, new UserMessage("What rooms does it have?"));
        chatMemory.add(memoryKeyA, new AssistantMessage("It has Double rooms starting from 1500 EGP and Suites from 3500 EGP."));

        // Retrieve conversation for User A
        List<AiMessageDto> historyA = aiAssistantService.getConversation(convId, userA.getId());
        assertEquals(4, historyA.size());
        assertEquals("user", historyA.get(0).role());
        assertEquals("Is Pharaohs Hotel available?", historyA.get(0).text());
        assertEquals("assistant", historyA.get(1).role());
        assertEquals("user", historyA.get(2).role());
        assertEquals("What rooms does it have?", historyA.get(2).text());

        // Verify User B with same convId has completely isolated memory (0 messages)
        List<AiMessageDto> historyB = aiAssistantService.getConversation(convId, userB.getId());
        assertTrue(historyB.isEmpty(), "User B must not see User A's conversation history even with the same conversationId");
    }

    @Test
    @DisplayName("System Prompt Integrity: Verified against hallucinated tools and required instructions")
    void test13_systemPromptIntegrity() throws Exception {
        String systemPrompt = systemPromptService.loadSystemPrompt();

        assertNotNull(systemPrompt);
        // Verify real tools are declared
        assertTrue(systemPrompt.contains("searchHotels"), "Prompt must declare searchHotels");
        assertTrue(systemPrompt.contains("searchBusTrips"), "Prompt must declare searchBusTrips");
        assertTrue(systemPrompt.contains("getMyBookings"), "Prompt must declare getMyBookings");
        assertTrue(systemPrompt.contains("checkRoomAvailability"), "Prompt must declare checkRoomAvailability");
        assertTrue(systemPrompt.contains("recommendBusTrips"), "Prompt must declare recommendBusTrips");
        assertTrue(systemPrompt.contains("getBusSeatAvailability"), "Prompt must declare getBusSeatAvailability");

        // Verify fake tools were removed
        assertFalse(systemPrompt.contains("createBookingDraft(draft)"), "Prompt must NOT list fake createBookingDraft tool");
        assertFalse(systemPrompt.contains("getBookingDraft(draftId)"), "Prompt must NOT list fake getBookingDraft tool");

        // Verify key instructions
        assertTrue(systemPrompt.contains("DATA-GROUNDED"), "Prompt must instruct data grounding");
        assertTrue(systemPrompt.contains("LANGUAGE"), "Prompt must instruct language matching");
        assertTrue(systemPrompt.contains("DIRECTLY"), "Prompt must instruct direct answers first");
    }
}
