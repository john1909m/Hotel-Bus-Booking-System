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
import com.spring.boot.service.ai.AiToolContext;

import java.time.LocalDate;
import java.util.*;

/**
 * Read-only AI tools. They delegate to existing services and never take a userId.
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
    @Tool(description = "Search hotels by city, maximum price per night and minimum rating. All parameters are optional.")
    public List<HotelDto> searchHotels(
            @ToolParam(required = false, description = "City name") String city,
            @ToolParam(required = false, description = "Maximum price per night") Double maxPrice,
            @ToolParam(required = false, description = "Minimum rating") Double minRating) {

        // Use the new paginated query for efficient search (small page of 10 results)
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "rating"));

        List<HotelDto> result = hotelService
                .getAllHotelsPaginated(pageable, null, city, minRating, maxPrice)
                .getContent();

        AiToolContext context = AiToolContextHolder.getContext();
        if (context != null) {
            context.addHotelResult(result);
        }

        return result;
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
    @Tool(description = "call it when the user did not provide destination, checkInDate, checkOutDate, guests or budget")
    public void reportMissingInformation(@ToolParam(description = "The fields that are missing (e.g. 'destination', 'checkInDate')") List<String> fields) {
        AiToolContext context = AiToolContextHolder.getContext();
        if (context != null) {
            context.reportMissingInformation(fields);
        }
    }
}