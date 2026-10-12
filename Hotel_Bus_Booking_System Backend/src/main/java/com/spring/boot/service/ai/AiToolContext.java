package com.spring.boot.service.ai;

import com.spring.boot.dto.BusSeatDto;
import com.spring.boot.dto.HotelDto;
import com.spring.boot.dto.RoomDto;
import com.spring.boot.dto.ai.AiResult;

import java.util.ArrayList;
import java.util.List;

/**
 * Request-scoped context for collecting tool execution results.
 * This ensures that tool results are collected per request and not shared between requests/users.
 */
public class AiToolContext {

    private final List<AiResult> results = new ArrayList<>();
    private final java.util.Set<String> missingInformation = new java.util.HashSet<>();

    /**
     * Adds a hotel search result.
     */
    public void addHotelResult(List<HotelDto> hotels) {
        if (hotels != null && !hotels.isEmpty()) {
            results.add(new AiResult("HOTEL", hotels));
        }
    }

    /**
     * Adds a hotel details result.
     */
    public void addHotelDetailsResult(HotelDto hotel) {
        if (hotel != null) {
            results.add(new AiResult("HOTEL_DETAILS", hotel));
        }
    }

    /**
     * Adds a room availability result.
     */
    public void addRoomResult(List<RoomDto> rooms) {
        if (rooms != null && !rooms.isEmpty()) {
            results.add(new AiResult("ROOM", rooms));
        }
    }

    /**
     * Adds a bus trip recommendation result.
     */
    public void addBusTripResult(BusTripRecommendation recommendation) {
        if (recommendation != null) {
            results.add(new AiResult("BUS_TRIP", recommendation));
        }
    }

    /**
     * Adds a bus seat availability result.
     */
    public void addSeatResult(List<BusSeatDto> seats) {
        if (seats != null && !seats.isEmpty()) {
            results.add(new AiResult("SEAT_MAP", seats));
        }
    }

    /**
     * Records missing information that the AI needs from the user.
     */
    public void reportMissingInformation(List<String> fields) {
        if (fields != null) {
            missingInformation.addAll(fields);
        }
    }

    /**
     * Gets the collected results.
     */
    public List<AiResult> getResults() {
        return new ArrayList<>(results);
    }

    /**
     * Gets the missing information.
     */
    public List<String> getMissingInformation() {
        return new ArrayList<>(missingInformation);
    }

    /**
     * Clears the context for reuse.
     */
    public void clear() {
        results.clear();
        missingInformation.clear();
    }
}