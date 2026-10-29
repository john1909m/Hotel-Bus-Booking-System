package com.spring.boot.repository;

import com.spring.boot.dto.analytics.*;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.PaymentMethod;
import com.spring.boot.enums.PaymentStatus;
import com.spring.boot.helper.AnalyticsConstants;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Repository dedicated to analytics queries.
 * Aggregations run completely in the database (GROUP BY, SUM, COUNT)
 * guaranteeing constant query count per endpoint and no in-memory row aggregation.
 */
@Repository
public class AnalyticsRepository {

    @PersistenceContext
    private EntityManager entityManager;

    private static final String REVENUE_STATUS_SQL = AnalyticsConstants.REVENUE_STATUSES.stream()
            .map(s -> "'" + s.name() + "'")
            .collect(Collectors.joining(", "));

    private static final String ACTIVE_STATUS_SQL = AnalyticsConstants.ACTIVE_STATUSES.stream()
            .map(s -> "'" + s.name() + "'")
            .collect(Collectors.joining(", "));

    // -------------------------------------------------------------
    // 1. SUMMARY
    // -------------------------------------------------------------

    public long countTotalHotels() {
        Number count = (Number) entityManager.createQuery("SELECT COUNT(h) FROM Hotel h").getSingleResult();
        return count != null ? count.longValue() : 0L;
    }

    public long countTotalRooms() {
        Number count = (Number) entityManager.createQuery("SELECT COUNT(r) FROM Room r").getSingleResult();
        return count != null ? count.longValue() : 0L;
    }

    public long countTotalBuses() {
        Number count = (Number) entityManager.createQuery("SELECT COUNT(b) FROM Bus b").getSingleResult();
        return count != null ? count.longValue() : 0L;
    }

    public long countTotalCustomers() {
        Number count = (Number) entityManager.createQuery(
                "SELECT COUNT(u) FROM User u WHERE u.role = com.spring.boot.enums.Role.USER"
        ).getSingleResult();
        return count != null ? count.longValue() : 0L;
    }

    /**
     * Aggregates hotel bookings count, active count, cancelled count, and revenue in a single query.
     * Returns Object[] { totalBookings, activeBookings, cancelledBookings, totalRevenue }
     */
    public Object[] getHotelBookingStats(LocalDate from, LocalDate to) {
        String jpql = "SELECT " +
                "COUNT(hb), " +
                "SUM(CASE WHEN hb.status IN (:activeStatuses) THEN 1L ELSE 0L END), " +
                "SUM(CASE WHEN hb.status = com.spring.boot.enums.BookingStatus.CANCELLED THEN 1L ELSE 0L END), " +
                "COALESCE(SUM(CASE WHEN hb.status IN (:revenueStatuses) THEN hb.totalPrice ELSE 0.0 END), 0.0) " +
                "FROM HotelBooking hb " +
                "WHERE hb.checkIn >= :from AND hb.checkIn <= :to";

        Query query = entityManager.createQuery(jpql)
                .setParameter("activeStatuses", AnalyticsConstants.ACTIVE_STATUSES)
                .setParameter("revenueStatuses", AnalyticsConstants.REVENUE_STATUSES)
                .setParameter("from", from)
                .setParameter("to", to);

        return (Object[]) query.getSingleResult();
    }

    /**
     * Aggregates bus bookings count, active count, cancelled count, and revenue in a single query.
     * Returns Object[] { totalBookings, activeBookings, cancelledBookings, totalRevenue }
     */
    public Object[] getBusBookingStats(LocalDate from, LocalDate to) {
        String jpql = "SELECT " +
                "COUNT(bb), " +
                "SUM(CASE WHEN bb.status IN (:activeStatuses) THEN 1L ELSE 0L END), " +
                "SUM(CASE WHEN bb.status = com.spring.boot.enums.BookingStatus.CANCELLED THEN 1L ELSE 0L END), " +
                "COALESCE(SUM(CASE WHEN bb.status IN (:revenueStatuses) THEN bb.price ELSE 0.0 END), 0.0) " +
                "FROM BusBooking bb " +
                "WHERE bb.bookingDate >= :from AND bb.bookingDate <= :to";

        Query query = entityManager.createQuery(jpql)
                .setParameter("activeStatuses", AnalyticsConstants.ACTIVE_STATUSES)
                .setParameter("revenueStatuses", AnalyticsConstants.REVENUE_STATUSES)
                .setParameter("from", from)
                .setParameter("to", to);

        return (Object[]) query.getSingleResult();
    }

    // -------------------------------------------------------------
    // 2. REVENUE TRENDS (DAY, WEEK, MONTH)
    // -------------------------------------------------------------

    /**
     * Uses PostgreSQL native date_trunc to group hotel revenue by DAY, WEEK, or MONTH.
     */
    @SuppressWarnings("unchecked")
    public Map<LocalDate, BigDecimal> getHotelRevenueByGranularity(LocalDate from, LocalDate to, String granularity) {
        String sql = "SELECT CAST(date_trunc(CAST(:granularity AS text), CAST(hb.check_in AS timestamp)) AS date) as period_start, " +
                "COALESCE(SUM(hb.total_price), 0) as revenue " +
                "FROM hotel_bookings hb " +
                "WHERE hb.check_in >= :from AND hb.check_in <= :to " +
                "AND hb.status IN (" + REVENUE_STATUS_SQL + ") " +
                "GROUP BY date_trunc(CAST(:granularity AS text), CAST(hb.check_in AS timestamp)) " +
                "ORDER BY period_start ASC";

        Query query = entityManager.createNativeQuery(sql)
                .setParameter("granularity", granularity.toLowerCase())
                .setParameter("from", from)
                .setParameter("to", to);

        List<Object[]> rows = query.getResultList();
        Map<LocalDate, BigDecimal> result = new LinkedHashMap<>();
        for (Object[] row : rows) {
            LocalDate date = toLocalDate(row[0]);
            BigDecimal rev = toBigDecimal(row[1]);
            result.put(date, rev);
        }
        return result;
    }

    /**
     * Uses PostgreSQL native date_trunc to group bus revenue by DAY, WEEK, or MONTH.
     */
    @SuppressWarnings("unchecked")
    public Map<LocalDate, BigDecimal> getBusRevenueByGranularity(LocalDate from, LocalDate to, String granularity) {
        String sql = "SELECT CAST(date_trunc(CAST(:granularity AS text), CAST(bb.booking_date AS timestamp)) AS date) as period_start, " +
                "COALESCE(SUM(bb.price), 0) as revenue " +
                "FROM bus_bookings bb " +
                "WHERE bb.booking_date >= :from AND bb.booking_date <= :to " +
                "AND bb.status IN (" + REVENUE_STATUS_SQL + ") " +
                "GROUP BY date_trunc(CAST(:granularity AS text), CAST(bb.booking_date AS timestamp)) " +
                "ORDER BY period_start ASC";

        Query query = entityManager.createNativeQuery(sql)
                .setParameter("granularity", granularity.toLowerCase())
                .setParameter("from", from)
                .setParameter("to", to);

        List<Object[]> rows = query.getResultList();
        Map<LocalDate, BigDecimal> result = new LinkedHashMap<>();
        for (Object[] row : rows) {
            LocalDate date = toLocalDate(row[0]);
            BigDecimal rev = toBigDecimal(row[1]);
            result.put(date, rev);
        }
        return result;
    }

    // -------------------------------------------------------------
    // 3. BOOKINGS TRENDS (DAY, WEEK, MONTH)
    // -------------------------------------------------------------

    /**
     * Uses PostgreSQL native date_trunc to group bookings count by period, optionally filtered by type and status.
     */
    @SuppressWarnings("unchecked")
    public Map<LocalDate, Long> getBookingsCountByGranularity(LocalDate from, LocalDate to, String granularity, String type, BookingStatus status) {
        String statusFilterValue = (status != null && status != BookingStatus.ANY) ? status.name() : null;

        String sql;
        if ("HOTEL".equalsIgnoreCase(type)) {
            sql = "SELECT CAST(date_trunc(CAST(:granularity AS text), CAST(hb.check_in AS timestamp)) AS date) as period_start, " +
                    "COUNT(hb.id) as cnt " +
                    "FROM hotel_bookings hb " +
                    "WHERE hb.check_in >= :from AND hb.check_in <= :to " +
                    "AND (CAST(:status AS text) IS NULL OR hb.status = CAST(:status AS text)) " +
                    "GROUP BY date_trunc(CAST(:granularity AS text), CAST(hb.check_in AS timestamp)) " +
                    "ORDER BY period_start ASC";
        } else if ("BUS".equalsIgnoreCase(type)) {
            sql = "SELECT CAST(date_trunc(CAST(:granularity AS text), CAST(bb.booking_date AS timestamp)) AS date) as period_start, " +
                    "COUNT(bb.id) as cnt " +
                    "FROM bus_bookings bb " +
                    "WHERE bb.booking_date >= :from AND bb.booking_date <= :to " +
                    "AND (CAST(:status AS text) IS NULL OR bb.status = CAST(:status AS text)) " +
                    "GROUP BY date_trunc(CAST(:granularity AS text), CAST(bb.booking_date AS timestamp)) " +
                    "ORDER BY period_start ASC";
        } else {
            sql = "SELECT period_start, SUM(cnt) as cnt FROM ( " +
                    "SELECT CAST(date_trunc(CAST(:granularity AS text), CAST(hb.check_in AS timestamp)) AS date) as period_start, " +
                    "COUNT(hb.id) as cnt " +
                    "FROM hotel_bookings hb " +
                    "WHERE hb.check_in >= :from AND hb.check_in <= :to " +
                    "AND (CAST(:status AS text) IS NULL OR hb.status = CAST(:status AS text)) " +
                    "GROUP BY date_trunc(CAST(:granularity AS text), CAST(hb.check_in AS timestamp)) " +
                    "UNION ALL " +
                    "SELECT CAST(date_trunc(CAST(:granularity AS text), CAST(bb.booking_date AS timestamp)) AS date) as period_start, " +
                    "COUNT(bb.id) as cnt " +
                    "FROM bus_bookings bb " +
                    "WHERE bb.booking_date >= :from AND bb.booking_date <= :to " +
                    "AND (CAST(:status AS text) IS NULL OR bb.status = CAST(:status AS text)) " +
                    "GROUP BY date_trunc(CAST(:granularity AS text), CAST(bb.booking_date AS timestamp)) " +
                    ") combined " +
                    "GROUP BY period_start " +
                    "ORDER BY period_start ASC";
        }

        Query query = entityManager.createNativeQuery(sql)
                .setParameter("granularity", granularity.toLowerCase())
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("status", statusFilterValue);

        List<Object[]> rows = query.getResultList();
        Map<LocalDate, Long> result = new LinkedHashMap<>();
        for (Object[] row : rows) {
            LocalDate date = toLocalDate(row[0]);
            Long cnt = toLong(row[1]);
            result.put(date, cnt);
        }
        return result;
    }

    // -------------------------------------------------------------
    // 4. BOOKINGS BY STATUS
    // -------------------------------------------------------------

    @SuppressWarnings("unchecked")
    public Map<BookingStatus, Long> getHotelBookingsByStatus(LocalDate from, LocalDate to) {
        String jpql = "SELECT hb.status, COUNT(hb) FROM HotelBooking hb " +
                "WHERE hb.checkIn >= :from AND hb.checkIn <= :to GROUP BY hb.status";
        List<Object[]> rows = entityManager.createQuery(jpql)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();

        Map<BookingStatus, Long> map = new EnumMap<>(BookingStatus.class);
        for (Object[] row : rows) {
            map.put((BookingStatus) row[0], toLong(row[1]));
        }
        return map;
    }

    @SuppressWarnings("unchecked")
    public Map<BookingStatus, Long> getBusBookingsByStatus(LocalDate from, LocalDate to) {
        String jpql = "SELECT bb.status, COUNT(bb) FROM BusBooking bb " +
                "WHERE bb.bookingDate >= :from AND bb.bookingDate <= :to GROUP BY bb.status";
        List<Object[]> rows = entityManager.createQuery(jpql)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();

        Map<BookingStatus, Long> map = new EnumMap<>(BookingStatus.class);
        for (Object[] row : rows) {
            map.put((BookingStatus) row[0], toLong(row[1]));
        }
        return map;
    }

    // -------------------------------------------------------------
    // 5. TOP HOTELS
    // -------------------------------------------------------------

    @SuppressWarnings("unchecked")
    public List<AnalyticsTopHotelItemDto> getTopHotels(LocalDate from, LocalDate to, String sortBy, int limit) {
        String orderClause = "REVENUE".equalsIgnoreCase(sortBy)
                ? "revenue DESC, bookings DESC, h.id ASC"
                : "bookings DESC, revenue DESC, h.id ASC";

        String sql = "SELECT h.id as hotel_id, " +
                "h.name as hotel_name, " +
                "h.city as city, " +
                "COUNT(hb.id) as bookings, " +
                "COALESCE(SUM(CASE WHEN hb.status IN (" + REVENUE_STATUS_SQL + ") THEN hb.total_price ELSE 0 END), 0) as revenue " +
                "FROM hotels h " +
                "JOIN hotel_bookings hb ON hb.hotel_id = h.id " +
                "WHERE hb.check_in >= :from AND hb.check_in <= :to " +
                "GROUP BY h.id, h.name, h.city " +
                "ORDER BY " + orderClause + " " +
                "LIMIT :limit";

        Query query = entityManager.createNativeQuery(sql)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("limit", Math.min(Math.max(limit, 1), 50));

        List<Object[]> rows = query.getResultList();
        List<AnalyticsTopHotelItemDto> items = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            items.add(AnalyticsTopHotelItemDto.builder()
                    .hotelId(toLong(row[0]))
                    .hotelName(row[1] != null ? row[1].toString() : "")
                    .city(row[2] != null ? row[2].toString() : "")
                    .bookings(toLong(row[3]))
                    .revenue(toBigDecimal(row[4]))
                    .build());
        }
        return items;
    }

    // -------------------------------------------------------------
    // 6. OCCUPANCY (WITH CLIPPING & MULTI-ROOM HANDLING)
    // -------------------------------------------------------------

    @SuppressWarnings("unchecked")
    public List<AnalyticsOccupancyItemDto> getHotelOccupancy(LocalDate from, LocalDate to, Long hotelId) {
        LocalDate toPlusOne = to.plusDays(1);
        long daysInPeriod = ChronoUnit.DAYS.between(from, to) + 1;

        String sql = "SELECT h.id as hotel_id, " +
                "h.name as hotel_name, " +
                "(SELECT COUNT(*) FROM rooms r WHERE r.hotel_id = h.id) as total_rooms, " +
                "COALESCE(( " +
                "    SELECT SUM( " +
                "        GREATEST(0, (LEAST(hb.check_out, CAST(:toPlusOne AS date)) - GREATEST(hb.check_in, CAST(:from AS date)))) * " +
                "        CASE WHEN EXISTS (SELECT 1 FROM hotel_booking_rooms hbr WHERE hbr.hotel_booking_id = hb.id) " +
                "             THEN (SELECT COUNT(*) FROM hotel_booking_rooms hbr WHERE hbr.hotel_booking_id = hb.id) " +
                "             ELSE 1 END " +
                "    ) " +
                "    FROM hotel_bookings hb " +
                "    WHERE hb.hotel_id = h.id " +
                "      AND hb.status IN (" + ACTIVE_STATUS_SQL + ") " +
                "      AND hb.check_in < CAST(:toPlusOne AS date) " +
                "      AND hb.check_out > CAST(:from AS date) " +
                "), 0) as room_nights_sold " +
                "FROM hotels h " +
                "WHERE (CAST(:hotelId AS bigint) IS NULL OR h.id = CAST(:hotelId AS bigint)) " +
                "ORDER BY h.id ASC";

        Query query = entityManager.createNativeQuery(sql)
                .setParameter("toPlusOne", toPlusOne)
                .setParameter("from", from)
                .setParameter("hotelId", hotelId);

        List<Object[]> rows = query.getResultList();
        List<AnalyticsOccupancyItemDto> items = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            Long hid = toLong(row[0]);
            String hname = row[1] != null ? row[1].toString() : "";
            long totalRooms = toLong(row[2]);
            long sold = toLong(row[3]);
            long available = totalRooms * daysInPeriod;

            double rate = 0.0;
            if (available > 0) {
                rate = BigDecimal.valueOf(sold)
                        .divide(BigDecimal.valueOf(available), 4, RoundingMode.HALF_UP)
                        .setScale(2, RoundingMode.HALF_UP)
                        .doubleValue();
            }

            items.add(AnalyticsOccupancyItemDto.builder()
                    .hotelId(hid)
                    .hotelName(hname)
                    .roomNightsSold(sold)
                    .roomNightsAvailable(available)
                    .occupancyRate(rate)
                    .build());
        }
        return items;
    }

    // -------------------------------------------------------------
    // 7. BUS TRIPS LOAD FACTOR
    // -------------------------------------------------------------

    @SuppressWarnings("unchecked")
    public List<AnalyticsBusTripItemDto> getBusTripsAnalytics(LocalDateTime fromDateTime, LocalDateTime toNextDayDateTime, Long routeId, int limit) {
        String sql = "SELECT bt.id as trip_id, " +
                "COALESCE(r.name, CONCAT(os.name, ' -> ', ds.name)) as route_name, " +
                "bt.departure_time as departure_time, " +
                "COALESCE(( " +
                "    SELECT COUNT(bb.id) " +
                "    FROM bus_bookings bb " +
                "    WHERE bb.bus_trip_id = bt.id " +
                "      AND bb.status IN (" + ACTIVE_STATUS_SQL + ") " +
                "), 0) as booked_seats, " +
                "b.capacity as total_seats " +
                "FROM bus_trips bt " +
                "JOIN bus_routes r ON bt.route_id = r.id " +
                "JOIN bus_stops os ON r.origin_stop_id = os.id " +
                "JOIN bus_stops ds ON r.destination_stop_id = ds.id " +
                "JOIN buses b ON bt.bus_id = b.id " +
                "WHERE bt.departure_time >= CAST(:fromDateTime AS timestamp) " +
                "  AND bt.departure_time < CAST(:toNextDayDateTime AS timestamp) " +
                "  AND (CAST(:routeId AS bigint) IS NULL OR bt.route_id = CAST(:routeId AS bigint)) " +
                "ORDER BY bt.departure_time DESC " +
                "LIMIT :limit";

        Query query = entityManager.createNativeQuery(sql)
                .setParameter("fromDateTime", fromDateTime)
                .setParameter("toNextDayDateTime", toNextDayDateTime)
                .setParameter("routeId", routeId)
                .setParameter("limit", Math.min(Math.max(limit, 1), 50));

        List<Object[]> rows = query.getResultList();
        List<AnalyticsBusTripItemDto> items = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            Long tripId = toLong(row[0]);
            String routeName = row[1] != null ? row[1].toString() : "";
            LocalDateTime depTime = toLocalDateTime(row[2]);
            long bookedSeats = toLong(row[3]);
            int totalSeats = row[4] != null ? ((Number) row[4]).intValue() : 0;

            double loadFactor = 0.0;
            if (totalSeats > 0) {
                loadFactor = BigDecimal.valueOf(bookedSeats)
                        .divide(BigDecimal.valueOf(totalSeats), 4, RoundingMode.HALF_UP)
                        .setScale(2, RoundingMode.HALF_UP)
                        .doubleValue();
            }

            items.add(AnalyticsBusTripItemDto.builder()
                    .tripId(tripId)
                    .routeName(routeName)
                    .departureTime(depTime)
                    .bookedSeats(bookedSeats)
                    .totalSeats(totalSeats)
                    .loadFactor(loadFactor)
                    .build());
        }
        return items;
    }

    // -------------------------------------------------------------
    // 8. PAYMENTS ANALYTICS
    // -------------------------------------------------------------

    @SuppressWarnings("unchecked")
    public List<AnalyticsPaymentItemDto> getPaymentsAnalytics(LocalDateTime fromDateTime, LocalDateTime toNextDayDateTime) {
        String sql = "SELECT p.payment_method, " +
                "p.payment_status, " +
                "COUNT(p.id) as cnt, " +
                "COALESCE(SUM(p.amount), 0) as total_amount " +
                "FROM payments p " +
                "WHERE (p.transaction_date >= CAST(:fromDateTime AS timestamp) AND p.transaction_date < CAST(:toNextDayDateTime AS timestamp)) " +
                "   OR (p.transaction_date IS NULL AND p.created_at >= CAST(:fromDateTime AS timestamp) AND p.created_at < CAST(:toNextDayDateTime AS timestamp)) " +
                "GROUP BY p.payment_method, p.payment_status " +
                "ORDER BY p.payment_method ASC, p.payment_status ASC";

        Query query = entityManager.createNativeQuery(sql)
                .setParameter("fromDateTime", fromDateTime)
                .setParameter("toNextDayDateTime", toNextDayDateTime);

        List<Object[]> rows = query.getResultList();
        List<AnalyticsPaymentItemDto> items = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            PaymentMethod method = null;
            if (row[0] != null) {
                try {
                    method = PaymentMethod.valueOf(row[0].toString());
                } catch (IllegalArgumentException ignored) {}
            }

            PaymentStatus status = null;
            if (row[1] != null) {
                try {
                    status = PaymentStatus.valueOf(row[1].toString());
                } catch (IllegalArgumentException ignored) {}
            }

            Long count = toLong(row[2]);
            BigDecimal amount = toBigDecimal(row[3]);

            items.add(AnalyticsPaymentItemDto.builder()
                    .paymentMethod(method)
                    .paymentStatus(status)
                    .count(count)
                    .amount(amount)
                    .build());
        }
        return items;
    }

    // -------------------------------------------------------------
    // HELPER CONVERTERS
    // -------------------------------------------------------------

    private LocalDate toLocalDate(Object val) {
        if (val == null) return null;
        if (val instanceof LocalDate ld) return ld;
        if (val instanceof Date d) return d.toLocalDate();
        if (val instanceof Timestamp ts) return ts.toLocalDateTime().toLocalDate();
        return LocalDate.parse(val.toString());
    }

    private LocalDateTime toLocalDateTime(Object val) {
        if (val == null) return null;
        if (val instanceof LocalDateTime ldt) return ldt;
        if (val instanceof Timestamp ts) return ts.toLocalDateTime();
        return LocalDateTime.parse(val.toString());
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal bd) return bd;
        return new BigDecimal(val.toString());
    }

    private Long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Number n) return n.longValue();
        return Long.parseLong(val.toString());
    }
}
