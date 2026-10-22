package com.spring.boot.service.ai;

import com.spring.boot.dto.BusSeatDto;
import com.spring.boot.dto.BusTripInfoDto;
import com.spring.boot.dto.HotelDto;
import com.spring.boot.dto.RoomDto;
import com.spring.boot.dto.UserBookingsDto;
import com.spring.boot.dto.ai.AiResult;

import java.util.ArrayList;
import java.util.List;

/**
 * Request-scoped context for collecting tool execution results.
 * This ensures that tool results are collected per request and not shared between requests/users.
 */
public class AiToolContext {

    private Long userId;
    private final List<AiResult> results = new ArrayList<>();
    private final java.util.Set<String> missingInformation = new java.util.HashSet<>();

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    /**
     * Adds a hotel search result.
     */
    public void addHotelResult(List<HotelDto> hotels) {
        if (hotels != null) {
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
        if (rooms != null) {
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
     * Adds a bus trip search result.
     */
    public void addBusTripSearchResult(List<BusTripInfoDto> busTrips) {
        if (busTrips != null) {
            results.add(new AiResult("BUS_SEARCH", busTrips));
        }
    }

    /**
     * Adds a bus seat availability result.
     */
    public void addSeatResult(List<BusSeatDto> seats) {
        if (seats != null) {
            results.add(new AiResult("SEAT_MAP", seats));
        }
    }

    /**
     * Adds user bookings result.
     */
    public void addUserBookingsResult(UserBookingsDto userBookings) {
        if (userBookings != null) {
            results.add(new AiResult("USER_BOOKINGS", userBookings));
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
        userId = null;
    }
}