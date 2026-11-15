package com.spring.boot.exception;

/**
 * Stable, domain-prefixed error codes returned across API error responses.
 */
public final class ErrorCode {

    private ErrorCode() {}

    // Common / Generic
    public static final String INTERNAL_ERROR = "INTERNAL_ERROR";
    public static final String INVALID_ARGUMENT = "INVALID_ARGUMENT";
    public static final String VALIDATION_FAILED = "VALIDATION_FAILED";
    public static final String RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND";
    public static final String BOOKING_CONFLICT = "BOOKING_CONFLICT";
    public static final String MALFORMED_REQUEST = "MALFORMED_REQUEST";
    public static final String TYPE_MISMATCH = "TYPE_MISMATCH";
    public static final String INVALID_SORT = "INVALID_SORT";
    public static final String DATA_CONFLICT = "DATA_CONFLICT";
    public static final String CONCURRENT_MODIFICATION = "CONCURRENT_MODIFICATION";
    public static final String METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED";
    public static final String TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS";

    // Authentication & Authorization
    public static final String AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS";
    public static final String AUTH_EMAIL_ALREADY_EXISTS = "AUTH_EMAIL_ALREADY_EXISTS";
    public static final String AUTH_ACCESS_DENIED = "AUTH_ACCESS_DENIED";
    public static final String AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED";
    public static final String AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID";
    public static final String AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED";

    // User
    public static final String USER_NOT_FOUND = "USER_NOT_FOUND";
    public static final String USER_EMAIL_EXISTS = "USER_EMAIL_EXISTS";

    // Hotel
    public static final String HOTEL_NOT_FOUND = "HOTEL_NOT_FOUND";
    public static final String HOTEL_HAS_BOOKINGS = "HOTEL_HAS_BOOKINGS";
    public static final String HOTEL_BUS_STOP_NOT_FOUND = "HOTEL_BUS_STOP_NOT_FOUND";

    // Room
    public static final String ROOM_NOT_FOUND = "ROOM_NOT_FOUND";
    public static final String ROOM_UNAVAILABLE = "ROOM_UNAVAILABLE";
    public static final String ROOM_NAMED_UNAVAILABLE = "ROOM_NAMED_UNAVAILABLE";
    public static final String ROOM_HAS_BOOKINGS = "ROOM_HAS_BOOKINGS";
    public static final String ROOM_TYPE_NOT_FOUND = "ROOM_TYPE_NOT_FOUND";
    public static final String ROOM_DUPLICATE_SELECTION = "ROOM_DUPLICATE_SELECTION";
    public static final String ROOM_DIFFERENT_HOTELS = "ROOM_DIFFERENT_HOTELS";

    // Hotel Booking
    public static final String HOTEL_BOOKING_NOT_FOUND = "HOTEL_BOOKING_NOT_FOUND";
    public static final String HOTEL_BOOKING_DATES_INVALID = "HOTEL_BOOKING_DATES_INVALID";
    public static final String HOTEL_BOOKING_CHECK_IN_REQUIRED = "HOTEL_BOOKING_CHECK_IN_REQUIRED";
    public static final String HOTEL_BOOKING_CHECK_OUT_REQUIRED = "HOTEL_BOOKING_CHECK_OUT_REQUIRED";
    public static final String HOTEL_BOOKING_CHECK_OUT_BEFORE_CHECK_IN = "HOTEL_BOOKING_CHECK_OUT_BEFORE_CHECK_IN";
    public static final String HOTEL_BOOKING_CHECK_IN_PAST = "HOTEL_BOOKING_CHECK_IN_PAST";
    public static final String HOTEL_BOOKING_GUEST_COUNT_EXCEEDED = "HOTEL_BOOKING_GUEST_COUNT_EXCEEDED";
    public static final String HOTEL_BOOKING_INVALID_ADULTS = "HOTEL_BOOKING_INVALID_ADULTS";
    public static final String HOTEL_BOOKING_INVALID_CHILD_AGE = "HOTEL_BOOKING_INVALID_CHILD_AGE";
    public static final String HOTEL_BOOKING_CONFLICT = "HOTEL_BOOKING_CONFLICT";
    public static final String HOTEL_BOOKING_STATUS_TRANSITION_INVALID = "HOTEL_BOOKING_STATUS_TRANSITION_INVALID";

    // Bus / Route / Stop / Feature
    public static final String BUS_NOT_FOUND = "BUS_NOT_FOUND";
    public static final String BUS_ROUTE_NOT_FOUND = "BUS_ROUTE_NOT_FOUND";
    public static final String BUS_STOP_NOT_FOUND = "BUS_STOP_NOT_FOUND";
    public static final String BUS_SEAT_NOT_FOUND = "BUS_SEAT_NOT_FOUND";
    public static final String BUS_SEAT_INVALID = "BUS_SEAT_INVALID";
    public static final String BUS_SEAT_ALREADY_BOOKED = "BUS_SEAT_ALREADY_BOOKED";
    public static final String BUS_SEAT_NOT_BELONG_TO_TRIP = "BUS_SEAT_NOT_BELONG_TO_TRIP";
    public static final String BUS_SEAT_NOT_BELONG_TO_BUS = "BUS_SEAT_NOT_BELONG_TO_BUS";
    public static final String BUS_ROUTE_TRIP_RELATIONSHIP_INVALID = "BUS_ROUTE_TRIP_RELATIONSHIP_INVALID";
    public static final String BUS_FEATURE_NOT_FOUND = "BUS_FEATURE_NOT_FOUND";
    public static final String BUS_FEATURE_INACTIVE = "BUS_FEATURE_INACTIVE";

    // Bus Trip
    public static final String BUS_TRIP_NOT_FOUND = "BUS_TRIP_NOT_FOUND";
    public static final String BUS_TRIP_UNAVAILABLE = "BUS_TRIP_UNAVAILABLE";
    public static final String BUS_TRIP_DEPARTED = "BUS_TRIP_DEPARTED";
    public static final String BUS_TRIP_TIME_REQUIRED = "BUS_TRIP_TIME_REQUIRED";
    public static final String BUS_TRIP_ARRIVAL_BEFORE_DEPARTURE = "BUS_TRIP_ARRIVAL_BEFORE_DEPARTURE";
    public static final String BUS_TRIP_SAME_RETURN = "BUS_TRIP_SAME_RETURN";
    public static final String BUS_TRIP_HAS_BOOKINGS = "BUS_TRIP_HAS_BOOKINGS";
    public static final String BUS_TRIP_PRICE_REQUIRED = "BUS_TRIP_PRICE_REQUIRED";
    public static final String BUS_TRIP_STATUS_REQUIRED = "BUS_TRIP_STATUS_REQUIRED";
    public static final String BUS_ID_REQUIRED = "BUS_ID_REQUIRED";
    public static final String ROUTE_ID_REQUIRED = "ROUTE_ID_REQUIRED";

    // Bus Booking
    public static final String BUS_BOOKING_NOT_FOUND = "BUS_BOOKING_NOT_FOUND";

    // Draft
    public static final String DRAFT_NOT_FOUND = "DRAFT_NOT_FOUND";
    public static final String DRAFT_EXPIRED = "DRAFT_EXPIRED";
    public static final String DRAFT_PRICE_CHANGED = "DRAFT_PRICE_CHANGED";
    public static final String DRAFT_ROOMS_REQUIRED = "DRAFT_ROOMS_REQUIRED";
    public static final String DRAFT_ROOM_NOT_IN_HOTEL = "DRAFT_ROOM_NOT_IN_HOTEL";
    public static final String DRAFT_ROOM_UNAVAILABLE = "DRAFT_ROOM_UNAVAILABLE";
    public static final String DRAFT_CAPACITY_EXCEEDED = "DRAFT_CAPACITY_EXCEEDED";
    public static final String DRAFT_SEAT_COUNT_MISMATCH = "DRAFT_SEAT_COUNT_MISMATCH";
    public static final String DRAFT_SEAT_UNAVAILABLE = "DRAFT_SEAT_UNAVAILABLE";
    public static final String DRAFT_SEAT_FROM_OTHER_BUS = "DRAFT_SEAT_FROM_OTHER_BUS";
    public static final String DRAFT_DUPLICATE_SELECTION = "DRAFT_DUPLICATE_SELECTION";

    // Payment
    public static final String PAYMENT_NOT_FOUND = "PAYMENT_NOT_FOUND";
    public static final String PAYMENT_ALREADY_COMPLETED = "PAYMENT_ALREADY_COMPLETED";
    public static final String PAYMENT_BOOKING_STATE_INVALID = "PAYMENT_BOOKING_STATE_INVALID";

    // Image
    public static final String IMAGE_NOT_FOUND = "IMAGE_NOT_FOUND";
    public static final String IMAGE_INVALID_URL = "IMAGE_INVALID_URL";
    public static final String IMAGE_HOST_NOT_ALLOWED = "IMAGE_HOST_NOT_ALLOWED";
    public static final String IMAGE_INVALID_CONTENT_TYPE = "IMAGE_INVALID_CONTENT_TYPE";
    public static final String IMAGE_STORAGE_DISABLED = "IMAGE_STORAGE_DISABLED";

    // Analytics
    public static final String ANALYTICS_DATE_FROM_REQUIRED = "ANALYTICS_DATE_FROM_REQUIRED";
    public static final String ANALYTICS_DATE_TO_REQUIRED = "ANALYTICS_DATE_TO_REQUIRED";
    public static final String ANALYTICS_DATE_RANGE_INVALID = "ANALYTICS_DATE_RANGE_INVALID";
    public static final String ANALYTICS_DATE_RANGE_EXCEEDED = "ANALYTICS_DATE_RANGE_EXCEEDED";
    public static final String ANALYTICS_GRANULARITY_INVALID = "ANALYTICS_GRANULARITY_INVALID";
    public static final String ANALYTICS_BOOKING_TYPE_INVALID = "ANALYTICS_BOOKING_TYPE_INVALID";
    public static final String ANALYTICS_SORT_BY_INVALID = "ANALYTICS_SORT_BY_INVALID";
    public static final String ANALYTICS_LIMIT_INVALID = "ANALYTICS_LIMIT_INVALID";

    // AI
    public static final String AI_SERVICE_UNAVAILABLE = "AI_SERVICE_UNAVAILABLE";
    public static final String AI_RATE_LIMIT = "AI_RATE_LIMIT";
}
