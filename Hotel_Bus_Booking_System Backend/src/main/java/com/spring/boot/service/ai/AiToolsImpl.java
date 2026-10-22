package com.spring.boot.service.ai;

import com.spring.boot.dto.*;
import com.spring.boot.service.interfaces.*;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;

/**
 * Read-only AI tools. They delegate to existing services and never take a userId from tool arguments.
 * Drafts and bookings are NOT tools: they go through the REST endpoints.
 */
@Component
@RequiredArgsConstructor
public class AiToolsImpl implements AiTools {

    private final HotelService hotelService;
    private final RoomService roomService;
    private final BusTripService busTripService;
    private final BusSeatService busSeatService;
    private final HotelBookingService hotelBookingService;
    private final BusBookingService busBookingService;

    @Override
    @Tool(description = "Fuzzy-search hotels by name/keyword, city, max price per night (EGP), and min rating (1-5). "
            + "Matching is partial and case-insensitive. Prefer the raw keyword the user said "
            + "(e.g. 'pharaohs'), NOT an expanded name like 'Pharaohs Hotel'. All parameters optional.")
    public List<HotelDto> searchHotels(
            @ToolParam(required = false, description = "Hotel name or keyword (e.g. 'Pharaohs', 'Hilton')") String name,
            @ToolParam(required = false, description = "City name (e.g. 'Cairo', 'Alexandria', 'Hurghada')") String city,
            @ToolParam(required = false, description = "Maximum room price per night in EGP") Double maxPrice,
            @ToolParam(required = false, description = "Minimum rating (1.0 to 5.0)") Double minRating) {

        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "rating"));

        // Drop generic words the model tends to append, and punctuation
        String cleaned = cleanHotelKeyword(name);

        List<HotelDto> result = hotelService
                .getAllHotelsPaginated(pageable, cleaned, city, minRating, maxPrice)
                .getContent();

        // Fallback: try the longest meaningful token ("pharaohs hotel" -> "pharaohs")
        if (result.isEmpty() && cleaned != null) {
            String token = longestToken(cleaned);
            if (token != null && !token.equalsIgnoreCase(cleaned)) {
                System.out.printf("AI hotel search fallback token='%s'%n", token);
                result = hotelService
                        .getAllHotelsPaginated(pageable, token, city, minRating, maxPrice)
                        .getContent();
            }
        }

        AiToolContext context = AiToolContextHolder.getContext();
        if (context != null) context.addHotelResult(result);
        System.out.println("AI hotel search results: " + result.size());
        return result;
    }

    private static final Set<String> NOISE_WORDS = Set.of(
            "hotel", "hotels", "resort", "resorts", "inn", "suites", "hostel", "lodge", "the", "a", "an");

    private static String cleanHotelKeyword(String raw) {
        if (raw == null) return null;
        String s = raw.replaceAll("['’\"]", " ").trim();
        if (s.isEmpty()) return null;
        // If it's only a single token, keep it as-is (don't strip "Pharaohs")
        String[] parts = s.split("\\s+");
        if (parts.length == 1) return parts[0];
        // Remove noise words; if everything got removed, keep the original
        String joined = Arrays.stream(parts)
                .filter(p -> !NOISE_WORDS.contains(p.toLowerCase()))
                .reduce((a, b) -> a + " " + b).orElse(s);
        return joined.isBlank() ? s : joined;
    }

    private static String longestToken(String s) {
        return Arrays.stream(s.split("\\s+"))
                .filter(t -> t.length() >= 3)
                .max(Comparator.comparingInt(String::length))
                .orElse(null);
    }

    @Override
    @Tool(description = "Get the details of one hotel by id.")
    public HotelDto getHotelDetails(@ToolParam(description = "Hotel id") Long hotelId) {
        HotelDto result = hotelService.getHotelById(hotelId);

        // Collect result in context
        AiToolContext context = AiToolContextHolder.getContext();
        if (context != null) {
            context.addHotelDetailsResult(result);
        }

        return result;
    }

    @Override
    public List<RoomDto> checkRoomAvailability(Long hotelId, LocalDate checkIn, LocalDate checkOut, Integer guests) {
        return checkRoomAvailability(hotelId, checkIn, checkOut, guests, Collections.emptyList());
    }

    @Override
    @Tool(description = "List the rooms of a hotel that are available for the given dates, number of adults, and optional child ages. Children under 12 do not count towards room capacity.")
    public List<RoomDto> checkRoomAvailability(
            @ToolParam(description = "Hotel id") Long hotelId,
            @ToolParam(description = "Check-in date, ISO format yyyy-MM-dd") LocalDate checkIn,
            @ToolParam(description = "Check-out date, ISO format yyyy-MM-dd") LocalDate checkOut,
            @ToolParam(description = "Number of adults (required, >= 1, or total guests if children omitted)") Integer adults,
            @ToolParam(description = "List of child ages (each 0-17)", required = false) List<Integer> childAges) {

        // Tool inputs come from the model: validate like any user input
        if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
            throw new IllegalArgumentException("Check-out must be after check-in");
        }

        int requiredCapacity = hotelBookingService.calculateRequiredCapacity(adults, childAges, null);

        List<RoomDto> result = roomService.getRoomsByHotelId(hotelId).stream()
                .filter(room -> room.getCapacity() >= requiredCapacity)
                .filter(room -> hotelBookingService.isRoomAvailable(hotelId, checkIn, checkOut, room.getId()))
                .toList();

        // Collect result in context
        AiToolContext context = AiToolContextHolder.getContext();
        if (context != null) {
            context.addRoomResult(result);
        }

        return result;
    }

    @Override
    @Tool(description = "Search scheduled bus trips between an origin city and destination city with optional departure date.")
    public List<BusTripInfoDto> searchBusTrips(
            @ToolParam(description = "Origin departure city (e.g. 'Cairo')") String originCity,
            @ToolParam(description = "Destination arrival city (e.g. 'Hurghada')") String destinationCity,
            @ToolParam(required = false, description = "Departure date in ISO format yyyy-MM-dd") LocalDate departureDate) {

        List<BusTripInfoDto> result = busTripService.searchBusTrips(originCity, destinationCity, departureDate);

        AiToolContext context = AiToolContextHolder.getContext();
        if (context != null) {
            context.addBusTripSearchResult(result);
        }

        return result;
    }

    @Override
    @Tool(description = "Recommend suitable outgoing and return bus trips for a hotel and stay dates.")
    public BusTripRecommendation recommendBusTrips(
            @ToolParam(description = "Hotel id") Long hotelId,
            @ToolParam(description = "Check-in date, ISO format yyyy-MM-dd") LocalDate checkIn,
            @ToolParam(description = "Check-out date, ISO format yyyy-MM-dd") LocalDate checkOut) {

        // TODO: use the hotel's real check-in/check-out times instead of these defaults
        String checkInTime = "15:00";
        String checkOutTime = "11:00";
        int timeBufferHours = 2;

        List<BusTripDto> outgoing = busTripService.findSuitableOutgoingTrips(
                hotelId, checkIn, checkInTime, timeBufferHours);
        List<BusTripDto> returning = busTripService.findSuitableReturnTrips(
                hotelId, checkOut, checkOutTime, timeBufferHours);

        BusTripRecommendation result = new BusTripRecommendation(outgoing, returning);

        // Collect result in context
        AiToolContext context = AiToolContextHolder.getContext();
        if (context != null) {
            context.addBusTripResult(result);
        }

        return result;
    }

    @Override
    @Tool(description = "List the seats still available on a bus trip.")
    public List<BusSeatDto> getBusSeatAvailability(@ToolParam(description = "Bus trip id") Long tripId) {
        BusTripDto trip = busTripService.getBusTripById(tripId);
        if (trip == null) {
            return List.of();
        }

        // One query for the booked seats of this trip (not one query per seat)
        Set<Long> bookedSeatIds = new HashSet<>(busBookingService.getBookedSeatIdsByTripId(tripId));

        List<BusSeatDto> result = busSeatService.getBusSeatsByBusId(trip.getBusId()).stream()
                .filter(seat -> !bookedSeatIds.contains(seat.getId()))
                .toList();

        // Collect result in context
        AiToolContext context = AiToolContextHolder.getContext();
        if (context != null) {
            context.addSeatResult(result);
        }

        return result;
    }

    @Override
    @Tool(description = "Retrieve the current authenticated user's hotel and bus bookings and their statuses. Takes no parameters.")
    public UserBookingsDto getMyBookings() {
        AiToolContext context = AiToolContextHolder.getContext();
        Long userId = context != null ? context.getUserId() : null;
        if (userId == null) {
            return new UserBookingsDto(Collections.emptyList(), Collections.emptyList());
        }

        List<HotelBookingDto> hotelBookings = hotelBookingService.getMyHotelBookings(userId);
        List<BusBookingDto> busBookings = busBookingService.getMyBusBookings(userId);

        UserBookingsDto result = new UserBookingsDto(hotelBookings, busBookings);
        if (context != null) {
            context.addUserBookingsResult(result);
        }

        return result;
    }

    @Override
    @Tool(description = "Report missing essential information needed to proceed with a booking flow (e.g. 'destination', 'checkInDate', 'checkOutDate', 'adults').")
    public void reportMissingInformation(@ToolParam(description = "The fields that are missing") List<String> fields) {
        AiToolContext context = AiToolContextHolder.getContext();
        if (context != null) {
            context.reportMissingInformation(fields);
        }
    }
}