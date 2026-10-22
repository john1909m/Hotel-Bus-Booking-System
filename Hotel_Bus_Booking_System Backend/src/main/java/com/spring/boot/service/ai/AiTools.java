package com.spring.boot.service.ai;

import com.spring.boot.dto.BusSeatDto;
import com.spring.boot.dto.BusTripDto;
import com.spring.boot.dto.BusTripInfoDto;
import com.spring.boot.dto.HotelDto;
import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.RoomDto;
import com.spring.boot.dto.UserBookingsDto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Interface defining the tools available to the AI assistant.
 * These tools delegate to existing services and are read-only except for createBookingDraft.
 */
public interface AiTools {

    /**
     * Search for hotels by name/keyword, city, maximum price, and minimum rating.
     *
     * @param name        Hotel name or search keyword (optional)
     * @param city        The city to search in (optional)
     * @param maxPrice    Maximum price per night (optional)
     * @param minRating   Minimum rating (optional)
     * @return List of matching hotels
     */
    List<HotelDto> searchHotels(String name, String city, Double maxPrice, Double minRating);

    /**
     * Search for hotels by city, maximum price, and minimum rating (backward compatible).
     *
     * @param city        The city to search in
     * @param maxPrice    Maximum price per night (optional)
     * @param minRating   Minimum rating (optional)
     * @return List of matching hotels
     */
    default List<HotelDto> searchHotels(String city, Double maxPrice, Double minRating) {
        return searchHotels(null, city, maxPrice, minRating);
    }

    /**
     * Get details for a specific hotel.
     *
     * @param hotelId   The hotel ID
     * @return Hotel details
     */
    HotelDto getHotelDetails(Long hotelId);

    /**
     * Check room availability for a hotel and date range with adults and child ages.
     * Children under 12 do not count towards room capacity.
     *
     * @param hotelId   The hotel ID
     * @param checkIn   Check-in date
     * @param checkOut  Check-out date
     * @param adults    Number of adults (>= 1)
     * @param childAges List of child ages (0-17, optional)
     * @return List of available rooms
     */
    List<RoomDto> checkRoomAvailability(Long hotelId, LocalDate checkIn, LocalDate checkOut, Integer adults, List<Integer> childAges);

    /**
     * Check room availability for a hotel and date range (backward compatible).
     *
     * @param hotelId   The hotel ID
     * @param checkIn   Check-in date
     * @param checkOut  Check-out date
     * @param guests    Number of guests
     * @return List of available rooms
     */
    default List<RoomDto> checkRoomAvailability(Long hotelId, LocalDate checkIn, LocalDate checkOut, Integer guests) {
        return checkRoomAvailability(hotelId, checkIn, checkOut, guests, java.util.Collections.emptyList());
    }

    /**
     * Recommend bus trips based on hotel and dates.
     *
     * @param hotelId   The hotel ID
     * @param checkIn   Check-in date
     * @param checkOut  Check-out date
     * @return Object containing outgoing and return trip recommendations
     */
    BusTripRecommendation recommendBusTrips(Long hotelId, LocalDate checkIn, LocalDate checkOut);

    /**
     * Get seat availability for a specific bus trip.
     *
     * @param tripId    The bus trip ID
     * @return List of available seats
     */
    List<BusSeatDto> getBusSeatAvailability(Long tripId);

    /**
     * Search scheduled bus trips between an origin city and destination city.
     *
     * @param originCity      The departure city
     * @param destinationCity The destination city
     * @param departureDate   The departure date (optional)
     * @return List of matching bus trips with route and stop details
     */
    List<BusTripInfoDto> searchBusTrips(String originCity, String destinationCity, LocalDate departureDate);

    /**
     * Retrieve the current authenticated user's hotel and bus bookings.
     * The user ID is securely resolved from context/JWT and never passed by the AI model.
     *
     * @return User bookings summary
     */
    UserBookingsDto getMyBookings();

    /**
     * Reports missing information that the AI needs from the user.
     * This tool has no side effects and is used purely for communication.
     *
     * @param fields The fields that are missing (e.g. "destination", "checkInDate")
     */
    void reportMissingInformation(List<String> fields);

}

/**
 * Response object for bus trip recommendations.
 */
class BusTripRecommendation {
    private List<BusTripDto> outgoingTrips;
    private List<BusTripDto> returnTrips;

    public BusTripRecommendation(List<BusTripDto> outgoingTrips, List<BusTripDto> returnTrips) {
        this.outgoingTrips = outgoingTrips;
        this.returnTrips = returnTrips;
    }

    public List<BusTripDto> getOutgoingTrips() {
        return outgoingTrips;
    }

    public List<BusTripDto> getReturnTrips() {
        return returnTrips;
    }
}

/**
 * Request object for creating a booking draft.
 */
class BookingDraftRequest {
    private Long userId; // Will be set from JWT in service layer
    private Long hotelId;
    private String hotelName;
    private Long roomId;
    private String roomNumber;
    private Integer roomCapacity;
    private BigDecimal roomPricePerNight;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer guests;
    private Long outgoingTripId;
    private Long returnTripId;
    private Long outgoingSeatId;
    private Long returnSeatId;
    private BigDecimal totalPrice;

    // Getters and setters
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getHotelId() { return hotelId; }
    public void setHotelId(Long hotelId) { this.hotelId = hotelId; }
    public String getHotelName() { return hotelName; }
    public void setHotelName(String hotelName) { this.hotelName = hotelName; }
    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }
    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }
    public Integer getRoomCapacity() { return roomCapacity; }
    public void setRoomCapacity(Integer roomCapacity) { this.roomCapacity = roomCapacity; }
    public BigDecimal getRoomPricePerNight() { return roomPricePerNight; }
    public void setRoomPricePerNight(BigDecimal roomPricePerNight) { this.roomPricePerNight = roomPricePerNight; }
    public LocalDate getCheckIn() { return checkIn; }
    public void setCheckIn(LocalDate checkIn) { this.checkIn = checkIn; }
    public LocalDate getCheckOut() { return checkOut; }
    public void setCheckOut(LocalDate checkOut) { this.checkOut = checkOut; }
    public Integer getGuests() { return guests; }
    public void setGuests(Integer guests) { this.guests = guests; }
    private Integer adults;
    private List<Integer> childAges;
    public Integer getAdults() { return adults; }
    public void setAdults(Integer adults) { this.adults = adults; }
    public List<Integer> getChildAges() { return childAges; }
    public void setChildAges(List<Integer> childAges) { this.childAges = childAges; }
    public Long getOutgoingTripId() { return outgoingTripId; }
    public void setOutgoingTripId(Long outgoingTripId) { this.outgoingTripId = outgoingTripId; }
    public Long getReturnTripId() { return returnTripId; }
    public void setReturnTripId(Long returnTripId) { this.returnTripId = returnTripId; }
    public Long getOutgoingSeatId() { return outgoingSeatId; }
    public void setOutgoingSeatId(Long outgoingSeatId) { this.outgoingSeatId = outgoingSeatId; }
    public Long getReturnSeatId() { return returnSeatId; }
    public void setReturnSeatId(Long returnSeatId) { this.returnSeatId = returnSeatId; }
    public BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }
}

/**
 * Response object for booking draft.
 */
class BookingDraftResponse {
    private String id;
    private Long userId;
    private Long hotelId;
    private String hotelName;
    private Long roomId;
    private String roomNumber;
    private Integer roomCapacity;
    private BigDecimal roomPricePerNight;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer guests;
    private Long outgoingTripId;
    private Long returnTripId;
    private Long outgoingSeatId;
    private Long returnSeatId;
    private BigDecimal totalPrice;
    private String status;
    private String expiresAt;

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getHotelId() { return hotelId; }
    public void setHotelId(Long hotelId) { this.hotelId = hotelId; }
    public String getHotelName() { return hotelName; }
    public void setHotelName(String hotelName) { this.hotelName = hotelName; }
    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }
    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }
    public Integer getRoomCapacity() { return roomCapacity; }
    public void setRoomCapacity(Integer roomCapacity) { this.roomCapacity = roomCapacity; }
    public BigDecimal getRoomPricePerNight() { return roomPricePerNight; }
    public void setRoomPricePerNight(BigDecimal roomPricePerNight) { this.roomPricePerNight = roomPricePerNight; }
    public LocalDate getCheckIn() { return checkIn; }
    public void setCheckIn(LocalDate checkIn) { this.checkIn = checkIn; }
    public LocalDate getCheckOut() { return checkOut; }
    public void setCheckOut(LocalDate checkOut) { this.checkOut = checkOut; }
    public Integer getGuests() { return guests; }
    public void setGuests(Integer guests) { this.guests = guests; }
    public Long getOutgoingTripId() { return outgoingTripId; }
    public void setOutgoingTripId(Long outgoingTripId) { this.outgoingTripId = outgoingTripId; }
    public Long getReturnTripId() { return returnTripId; }
    public void setReturnTripId(Long returnTripId) { this.returnTripId = returnTripId; }
    public Long getOutgoingSeatId() { return outgoingSeatId; }
    public void setOutgoingSeatId(Long outgoingSeatId) { this.outgoingSeatId = outgoingSeatId; }
    public Long getReturnSeatId() { return returnSeatId; }
    public void setReturnSeatId(Long returnSeatId) { this.returnSeatId = returnSeatId; }
    public BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }
}